FROM python:3.11-slim

# Crea un usuario no-root (Requisito para Hugging Face Spaces)
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

# Copiar requirements y hacer la instalación
COPY --chown=user ./requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /app/requirements.txt

# Copiar el código
COPY --chown=user . /app

# Exponer el puerto por defecto de Hugging Face Spaces
EXPOSE 7860

# Comando para iniciar Uvicorn
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "7860"]
