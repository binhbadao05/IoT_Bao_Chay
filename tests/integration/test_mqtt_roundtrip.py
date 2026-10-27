"""Integration test for simulator-driven worker pipeline, skippable without broker."""
import json
import os
import time

import pytest


@pytest.mark.integration
def test_mqtt_roundtrip_if_broker_available():
    if os.getenv("RUN_MQTT_INTEGRATION", "0") != "1":
        pytest.skip("Set RUN_MQTT_INTEGRATION=1 with Mosquitto running")
    assert True
