from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

from app.agent import tools
from app.utils.metadata import MetadataManager


def test_llm_api_key_override_falls_back_to_environment(monkeypatch):
    monkeypatch.setattr(tools, "OPENAI_API_KEY", "environment-key")
    monkeypatch.setattr(tools, "OPENAI_API_BASE", "https://env.example/v1")
    tools.configure_llm_api_key(None)
    tools.configure_llm_api_base_url(None)

    environment_status = tools.get_llm_api_key_status()
    tools.configure_llm_api_key("admin-override-key")
    tools.configure_llm_api_base_url("https://override.example/v1/")
    override_status = tools.get_llm_api_key_status()
    tools.configure_llm_api_key(None)
    tools.configure_llm_api_base_url(None)

    assert environment_status == {
        "configured": True,
        "source": "environment",
        "masked_key": "••••-key",
        "base_url": "https://env.example/v1",
        "base_url_source": "environment",
    }
    assert override_status == {
        "configured": True,
        "source": "override",
        "masked_key": "••••-key",
        "base_url": "https://override.example/v1",
        "base_url_source": "override",
    }


def test_configuring_api_key_invalidates_cached_llm():
    tools._llm_instance = object()  # type: ignore[assignment]

    tools.configure_llm_api_key("new-key")

    assert tools._llm_instance is None
    tools.configure_llm_api_key(None)


def test_configuring_base_url_invalidates_cached_llm():
    tools._llm_instance = object()  # type: ignore[assignment]

    tools.configure_llm_api_base_url("https://example.com/v1/")

    assert tools._llm_instance is None
    assert tools.get_llm_api_key_status()["base_url"] == "https://example.com/v1"
    tools.configure_llm_api_base_url(None)


def test_metadata_settings_can_be_updated_and_deleted():
    manager = MetadataManager()
    manager.engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    manager._create_tables()

    assert manager.get_setting("example") is None

    manager.set_setting("example", "first")
    assert manager.get_setting("example") == "first"

    manager.set_setting("example", "second")
    assert manager.get_setting("example") == "second"

    manager.delete_setting("example")
    assert manager.get_setting("example") is None
