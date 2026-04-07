"""Optional OpenTelemetry instrumentation.

Activates only when OTEL_EXPORTER_OTLP_ENDPOINT is set.
"""

import os

import structlog

logger = structlog.get_logger()


def setup_telemetry(app_name: str = "echostats-api") -> None:
    """Configure OpenTelemetry if OTLP endpoint is available."""
    endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT")
    if not endpoint:
        return

    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor

        resource = Resource.create({"service.name": app_name})
        provider = TracerProvider(resource=resource)
        exporter = OTLPSpanExporter(endpoint=endpoint)
        provider.add_span_processor(BatchSpanProcessor(exporter))
        trace.set_tracer_provider(provider)

        FastAPIInstrumentor.instrument()
        HTTPXClientInstrumentor().instrument()

        logger.info("OpenTelemetry initialized", endpoint=endpoint)
    except ImportError:
        logger.info("OpenTelemetry packages not installed, skipping")
    except Exception as e:
        logger.warning("OpenTelemetry setup failed", error=str(e))
