FROM python:3.14.7-slim

COPY --from=ghcr.io/astral-sh/uv:0.12.13 /uv /uvx /bin/

# Create app user and /app directory upfront when /app is empty (takes 0.01s)
RUN useradd -m -u 1000 app && \
    mkdir -p /app/uploads && \
    chown -R app:app /app

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

COPY --chown=app:app requirements.txt ./

# Install venv as app user directly - avoids chown -R over thousands of packages
USER app

RUN --mount=type=cache,target=/home/app/.cache/uv,uid=1000,gid=1000 \
    uv venv && \
    uv pip install -r requirements.txt

COPY --chown=app:app . .

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8000/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
