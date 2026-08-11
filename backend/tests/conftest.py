import pytest
import json
import os

@pytest.fixture
def greenhouse_fixture():
    path = os.path.join(os.path.dirname(__file__), "fixtures/greenhouse/stripe_jobs.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

@pytest.fixture
def ashby_fixture():
    path = os.path.join(os.path.dirname(__file__), "fixtures/ashby/linear_jobs.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

@pytest.fixture
def lever_fixture():
    path = os.path.join(os.path.dirname(__file__), "fixtures/lever/netflix_jobs.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)
