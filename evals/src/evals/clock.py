"""统一时钟：Asia/Shanghai。

Windows 上零依赖核心不带 tzdata 包、系统也无 tz 库，ZoneInfo 会抛
ZoneInfoNotFoundError；中国无夏令时，固定 UTC+8 与 Asia/Shanghai 等价。
"""

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

try:
    TZ = ZoneInfo("Asia/Shanghai")
except ZoneInfoNotFoundError:
    TZ = timezone(timedelta(hours=8))


def iso_now(timespec: str = "seconds") -> str:
    return datetime.now(TZ).isoformat(timespec=timespec)


def stamp() -> str:
    return datetime.now(TZ).strftime("%Y%m%d-%H%M%S")
