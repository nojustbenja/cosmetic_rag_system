import time
import logging
from functools import wraps

logger = logging.getLogger("profiler")
logger.setLevel(logging.INFO)
# Configurar un handler para que los logs del profiler se destaquen
if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    formatter = logging.Formatter('\033[94m[PROFILER]\033[0m %(asctime)s - %(message)s')
    ch.setFormatter(formatter)
    logger.addHandler(ch)

def profile_time(func):
    """
    Decorador para medir y registrar el tiempo de ejecución de una función asíncrona o síncrona.
    """
    import asyncio

    if asyncio.iscoroutinefunction(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.perf_counter()
            try:
                return await func(*args, **kwargs)
            finally:
                end_time = time.perf_counter()
                elapsed_ms = (end_time - start_time) * 1000
                logger.info(f"⏳ {func.__name__} tomó {elapsed_ms:.2f} ms")
        return async_wrapper
    else:
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.perf_counter()
            try:
                return func(*args, **kwargs)
            finally:
                end_time = time.perf_counter()
                elapsed_ms = (end_time - start_time) * 1000
                logger.info(f"⏳ {func.__name__} tomó {elapsed_ms:.2f} ms")
        return sync_wrapper

class profile_block:
    """
    Context manager para medir un bloque de código.
    Uso:
        with profile_block("Nombre del bloque"):
            # código
    """
    def __init__(self, name: str):
        self.name = name
        self.start_time = 0.0

    def __enter__(self):
        self.start_time = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        end_time = time.perf_counter()
        elapsed_ms = (end_time - self.start_time) * 1000
        logger.info(f"⏳ [BLOCK] {self.name} tomó {elapsed_ms:.2f} ms")
