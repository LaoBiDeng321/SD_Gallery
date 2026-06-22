"""日志管理模块 - 实现日志轮转、自动清理和审计功能"""

import os
import sys
import time
import threading
import json
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from logging.handlers import TimedRotatingFileHandler
import logging


class AuditLogger:
    """审计日志记录器 - 记录所有清理操作的审计信息"""

    def __init__(self, log_dir):
        self.log_dir = Path(log_dir)
        self.audit_file = self.log_dir / 'audit.json'
        self._lock = threading.Lock()

    def _load_audit_log(self):
        """加载审计日志"""
        if self.audit_file.exists():
            try:
                with open(self.audit_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return []
        return []

    def _save_audit_log(self, records):
        """保存审计日志"""
        try:
            with open(self.audit_file, 'w', encoding='utf-8') as f:
                json.dump(records, f, ensure_ascii=False, indent=2)
        except:
            pass

    def log_cleanup(self, action, details):
        """记录清理操作到审计日志

        Args:
            action: 操作类型 (startup_cleanup, scheduled, space_triggered, count_triggered, manual)
            details: 操作详情字典
        """
        with self._lock:
            records = self._load_audit_log()
            record = {
                'timestamp': datetime.now().isoformat(),
                'action': action,
                'details': details
            }
            records.append(record)
            # 只保留最近1000条审计记录
            if len(records) > 1000:
                records = records[-1000:]
            self._save_audit_log(records)


class DayRotatingFileHandler(TimedRotatingFileHandler):
    """按天轮转的日志处理器，支持多种清理触发机制"""

    def __init__(self, log_dir, log_file, retain_days=7,
                 max_file_size_mb=10, max_file_count=100):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.retain_days = retain_days
        self.log_file_base = log_file
        self.max_file_size_bytes = max_file_size_mb * 1024 * 1024
        self.max_file_count = max_file_count
        self.audit_logger = AuditLogger(log_dir)

        # 拼接完整路径
        log_path = self.log_dir / f"{log_file}.log"

        super().__init__(
            filename=str(log_path),
            when='midnight',
            interval=1,
            backupCount=0,  # 我们自己管理备份
            encoding='utf-8',
            delay=True
        )

        # 启动定时清理检查线程
        self._cleanup_thread = None
        self._running = True
        self._start_cleanup_scheduler()

    def _start_cleanup_scheduler(self):
        """启动定时清理调度器"""
        self._cleanup_thread = threading.Thread(target=self._cleanup_scheduler, daemon=True)
        self._cleanup_thread.start()

    def _cleanup_scheduler(self):
        """定时清理调度器 - 检查是否需要执行清理"""
        last_cleanup_date = datetime.now().date()

        while self._running:
            try:
                now = datetime.now()

                # 1. 每日定时清理（中午12点）
                if now.hour == 12 and now.date() != last_cleanup_date:
                    last_cleanup_date = now.date()
                    self._execute_cleanup('scheduled', reason='每日定时清理')

                # 2. 检查文件大小触发
                if self._should_cleanup_by_size():
                    self._execute_cleanup('space_triggered',
                        reason=f'日志总大小超过 {self.max_file_size_bytes // (1024*1024)}MB 阈值')

                # 3. 检查文件数量触发
                if self._should_cleanup_by_count():
                    self._execute_cleanup('count_triggered',
                        reason=f'日志文件数量超过 {self.max_file_count} 个上限')

                # 每小时检查一次
                time.sleep(3600)

            except Exception:
                time.sleep(60)

    def _should_cleanup_by_size(self):
        """检查是否达到空间阈值"""
        if not self.log_dir.exists():
            return False

        # 计算所有日志文件的总大小（包含 request.log）
        total_size = sum(
            f.stat().st_size for f in self.log_dir.glob(f"{self.log_file_base}*.log")
        )
        total_size += sum(
            f.stat().st_size for f in self.log_dir.glob("request.log*")
        )
        return total_size >= self.max_file_size_bytes

    def _should_cleanup_by_count(self):
        """检查是否达到文件数量上限"""
        if not self.log_dir.exists():
            return False

        # 计算所有日志文件的数量（包含 request.log 备份）
        count = len(list(self.log_dir.glob(f"{self.log_file_base}*.log")))
        count += len(list(self.log_dir.glob("request.log*")))
        return count >= self.max_file_count

    def _execute_cleanup(self, action, reason=''):
        """执行清理操作"""
        deleted_files = []
        total_size = 0

        # 1. 清理过期文件（主日志）
        cutoff_time = time.time() - (self.retain_days * 24 * 60 * 60)
        for file in self.log_dir.glob(f"{self.log_file_base}*.log"):
            try:
                if file.stat().st_mtime < cutoff_time:
                    size = file.stat().st_size
                    deleted_files.append({
                        'filename': file.name,
                        'size': size,
                        'created': datetime.fromtimestamp(file.stat().st_ctime).isoformat(),
                        'deleted_at': datetime.now().isoformat()
                    })
                    total_size += size
                    file.unlink()
            except Exception:
                pass

        # 2. 清理过期的 request.log 备份
        for file in self.log_dir.glob("request.log.*"):
            try:
                if file.stat().st_mtime < cutoff_time:
                    size = file.stat().st_size
                    deleted_files.append({
                        'filename': file.name,
                        'size': size,
                        'created': datetime.fromtimestamp(file.stat().st_ctime).isoformat(),
                        'deleted_at': datetime.now().isoformat()
                    })
                    total_size += size
                    file.unlink()
            except Exception:
                pass

        # 记录审计日志
        audit_details = {
            'reason': reason,
            'deleted_files': deleted_files,
            'total_deleted_count': len(deleted_files),
            'total_deleted_bytes': total_size,
            'trigger': action
        }
        self.audit_logger.log_cleanup(action, audit_details)

        # 只有当日志文件存在时才执行轮转
        if os.path.exists(self.baseFilename):
            self.doRollover()

    def doRollover(self):
        """执行日志轮转"""
        if not os.path.exists(self.baseFilename):
            return

        if self.stream:
            self.stream.close()
            self.stream = None

        # 移动当前日志到带日期的备份
        if os.path.exists(self.baseFilename):
            t = self.rotation_filename(self.baseFilename)
            if os.path.exists(t):
                try:
                    os.remove(t)
                except PermissionError:
                    # Windows 文件被锁定，等待后重试
                    time.sleep(0.5)
                    try:
                        os.remove(t)
                    except:
                        pass
            try:
                os.rename(self.baseFilename, t)
            except PermissionError:
                # 文件被锁定，尝试重命名
                time.sleep(0.5)
                try:
                    os.rename(self.baseFilename, t)
                except:
                    pass

        # 立即清理超过保留期的备份文件
        self._cleanup_old_backups()

    def _cleanup_old_backups(self):
        """清理超过保留期的备份文件"""
        cutoff_time = time.time() - (self.retain_days * 24 * 60 * 60)
        backup_pattern = f"{self.log_file_base}.log.*"

        for file in self.log_dir.glob(backup_pattern):
            try:
                if file.stat().st_mtime < cutoff_time:
                    file.unlink()
            except Exception:
                pass

        # 清理 request.log 超过保留期的部分（只保留最后一天）
        request_log = self.log_dir / 'request.log'
        if request_log.exists():
            try:
                # 检查文件修改时间
                if request_log.stat().st_mtime < cutoff_time:
                    # 备份并创建新文件
                    backup_name = f"request.log.{datetime.now().strftime('%Y-%m-%d')}"
                    backup_path = self.log_dir / backup_name
                    try:
                        request_log.rename(backup_path)
                    except:
                        pass
            except Exception:
                pass

    def close(self):
        """关闭处理器"""
        self._running = False
        super().close()


class LogManager:
    """日志管理器 - 统一管理日志系统的各个组件"""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if hasattr(self, '_initialized'):
            return
        self._initialized = True
        self.logger = None
        self.audit_logger = None
        self._started = False

    def initialize(self, log_dir=None, log_file='sd-gallery',
                   retain_days=7, max_file_size_mb=10, max_file_count=100):
        """初始化日志系统

        Args:
            log_dir: 日志目录路径
            log_file: 日志文件名（不含扩展名）
            retain_days: 日志保留天数
            max_file_size_mb: 触发清理的日志总大小阈值（MB）
            max_file_count: 触发清理的日志文件数量上限
        """
        if log_dir is None:
            log_dir = Path(__file__).parent.parent.parent / 'logs'

        log_dir = Path(log_dir)
        log_dir.mkdir(parents=True, exist_ok=True)

        self.log_dir = log_dir
        self.retain_days = retain_days
        self.max_file_size_mb = max_file_size_mb
        self.max_file_count = max_file_count
        self.log_file = log_file

    def setup_logger(self, name='sd-gallery', level=logging.INFO):
        """配置并返回日志记录器

        Args:
            name: 日志记录器名称
            level: 日志级别

        Returns:
            logging.Logger: 配置好的日志记录器
        """
        logger = logging.getLogger(name)
        logger.setLevel(level)
        logger.propagate = False
        logger.handlers.clear()

        # 创建文件handler
        file_handler = DayRotatingFileHandler(
            log_dir=self.log_dir,
            log_file=self.log_file,
            retain_days=self.retain_days,
            max_file_size_mb=self.max_file_size_mb,
            max_file_count=self.max_file_count
        )

        formatter = logging.Formatter(
            fmt='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(formatter)
        file_handler.setLevel(level)
        logger.addHandler(file_handler)

        self.logger = logger
        self.audit_logger = file_handler.audit_logger

        # 启动时清理过期文件（但不执行轮转）
        if not self._started:
            self._started = True
            file_handler._cleanup_old_backups()

        return logger

    def get_audit_log(self, limit=100):
        """获取审计日志

        Args:
            limit: 返回最近N条记录

        Returns:
            list: 审计日志记录列表
        """
        if self.audit_logger:
            records = self.audit_logger._load_audit_log()
            return records[-limit:]
        return []

    def manual_cleanup(self, operator='admin'):
        """手动触发清理

        Args:
            operator: 操作人标识

        Returns:
            dict: 清理结果
        """
        if not self.logger:
            return {'success': False, 'error': '日志系统未初始化'}

        # 查找handler执行清理
        for handler in self.logger.handlers:
            if isinstance(handler, DayRotatingFileHandler):
                handler._execute_cleanup('manual', reason=f'手动触发，操作人: {operator}')
                return {'success': True, 'message': '清理完成'}

        return {'success': False, 'error': '未找到日志处理器'}

    def get_status(self):
        """获取日志系统状态

        Returns:
            dict: 状态信息
        """
        if not self.log_dir:
            return {'initialized': False}

        log_files = list(self.log_dir.glob(f"{self.log_file}*.log"))
        total_size = sum(f.stat().st_size for f in log_files)

        return {
            'initialized': True,
            'log_dir': str(self.log_dir),
            'retain_days': self.retain_days,
            'max_file_size_mb': self.max_file_size_mb,
            'max_file_count': self.max_file_count,
            'log_files_count': len(log_files),
            'total_size_bytes': total_size,
            'total_size_mb': round(total_size / (1024 * 1024), 2)
        }


# 全局单例
_log_manager = LogManager()


def setup_logger(
    name='sd-gallery',
    log_dir=None,
    log_file='sd-gallery',
    retain_days=7,
    max_file_size_mb=10,
    max_file_count=100,
    level=logging.INFO
):
    """
    配置日志系统

    Args:
        name: 日志记录器名称
        log_dir: 日志目录路径，默认在项目根目录的 logs 文件夹
        log_file: 日志文件名（不含扩展名）
        retain_days: 日志保留天数，默认7天
        max_file_size_mb: 触发清理的日志总大小阈值（MB），默认10MB
        max_file_count: 触发清理的日志文件数量上限，默认100个
        level: 日志级别

    Returns:
        logging.Logger: 配置好的日志记录器
    """
    _log_manager.initialize(
        log_dir=log_dir,
        log_file=log_file,
        retain_days=retain_days,
        max_file_size_mb=max_file_size_mb,
        max_file_count=max_file_count
    )
    return _log_manager.setup_logger(name=name, level=level)


def get_logger(name='sd-gallery'):
    """获取已配置的日志记录器"""
    return logging.getLogger(name)


def get_log_manager():
    """获取日志管理器实例"""
    return _log_manager
