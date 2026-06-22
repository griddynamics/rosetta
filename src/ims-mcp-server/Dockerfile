ARG PYTHON_VERSION=3.12
FROM python:${PYTHON_VERSION}-slim AS builder

WORKDIR /build

# Copy package files
COPY pyproject.toml README.md ./
COPY ims_mcp/ ./ims_mcp/

# Install dependencies with editable mode for hot-reload
RUN pip install --no-cache-dir --user -e ".[redis]"


FROM python:${PYTHON_VERSION}-slim

# Prevents Python from writing pyc files
ENV PYTHONDONTWRITEBYTECODE=1

# Keeps Python from buffering stdout and stderr
ENV PYTHONUNBUFFERED=1

# E0: Enable Python fault handler — dumps all-thread stack traces on fatal signals
# and arms the in-flight watchdog's faulthandler.dump_traceback() (A8/DD-7).
ENV PYTHONFAULTHANDLER=1

LABEL description="Rosetta MCP Server"

RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/home/rosetta" \
    --shell "/sbin/nologin" \
    --uid 1000 \
    rosetta && \
    mkdir -p /app /home/rosetta/.local/share && \
    chown -R rosetta:rosetta /app /home/rosetta

WORKDIR /app

COPY --from=builder --chown=rosetta:rosetta /root/.local /home/rosetta/.local
COPY --from=builder --chown=rosetta:rosetta /build/ims_mcp/ ./ims_mcp/

ENV PATH=/home/rosetta/.local/bin:$PATH
ENV PYTHONPATH=/home/rosetta/.local/lib/python3.12/site-packages

ENV ROSETTA_TRANSPORT=http
ENV ROSETTA_HTTP_HOST=0.0.0.0
ENV ROSETTA_HTTP_PORT=8000

USER rosetta    

EXPOSE 8000

# E1: Docker health check using Python stdlib only (NFR-6).
# Interval/timeout align with /healthz cache TTL + probe (D2/D3).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD ["python", "-c", "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/healthz',timeout=4).status==200 else 1)"]

CMD ["python", "-m", "ims_mcp"]