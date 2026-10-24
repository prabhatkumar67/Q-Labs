"""Reviewable acceptance contracts. Actions alone cannot constitute a test."""

from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Navigate(StrictModel):
    action: Literal["navigate"]
    path: str = Field(min_length=1, max_length=2048, pattern=r"^/([^/\\].*)?$")


class Click(StrictModel):
    action: Literal["click"]
    selector: str = Field(min_length=1, max_length=500)


class Fill(StrictModel):
    action: Literal["fill"]
    selector: str = Field(min_length=1, max_length=500)
    value: str = Field(max_length=2000)


class AssertText(StrictModel):
    action: Literal["assert_text"]
    selector: str = Field(min_length=1, max_length=500)
    expected: str = Field(min_length=1, max_length=2000)


class AssertURL(StrictModel):
    action: Literal["assert_url"]
    path: str = Field(min_length=1, max_length=2048, pattern=r"^/([^/\\].*)?$")


Step = Annotated[Union[Navigate, Click, Fill, AssertText, AssertURL], Field(discriminator="action")]


class TestPlan(StrictModel):
    name: str = Field(min_length=1, max_length=120)
    steps: list[Step] = Field(min_length=1, max_length=50)

    def require_assertions(self):
        if not any(isinstance(step, (AssertText, AssertURL)) for step in self.steps):
            raise ValueError("A test requires at least one explicit expected outcome.")
        return self
