/** @vitest-environment happy-dom */

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const { signInMock, signUpMock } = vi.hoisted(() => ({
  signInMock: vi.fn(async () => ({ email: "user@example.com", sessionToken: "session" })),
  signUpMock: vi.fn(async () => ({ email: "user@example.com", sessionToken: "session" })),
}));

vi.mock("@/lib/authPassword", () => ({
  passwordRequirementsHint: () => "Use at least 8 characters with a letter and a number.",
  requestPasswordReset: vi.fn(),
  signInWithPassword: signInMock,
  signUpWithPassword: signUpMock,
}));

vi.mock("@/lib/authGoogle", () => ({
  signInWithGoogle: vi.fn(),
}));

import { ChatLoginForm } from "../../web/components/chat/ChatLoginForm";

let root: Root | null = null;

function mount(node: ReactElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root?.render(node);
  });
}

function queryButton(name: string): HTMLButtonElement {
  const button = [...document.querySelectorAll("button")].find((element) => {
    const label = element.getAttribute("aria-label") || element.textContent || "";
    return label.trim() === name;
  });
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Missing button ${name}`);
  return button;
}

function queryField(labelText: string): HTMLInputElement {
  const label = [...document.querySelectorAll("label")].find(
    (element) => element.textContent?.trim() === labelText
  );
  const input = label ? document.getElementById(label.htmlFor) : null;
  if (!(input instanceof HTMLInputElement)) throw new Error(`Missing field ${labelText}`);
  return input;
}

function setValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  document.body.innerHTML = "";
  signInMock.mockClear();
  signUpMock.mockClear();
  localStorage.clear();
  sessionStorage.clear();
});

describe("password visibility", () => {
  it("starts hidden and toggles on sign-in without changing the submitted password", async () => {
    mount(createElement(ChatLoginForm));
    const password = queryField("Password");
    expect(password.type).toBe("password");

    setValue(queryField("Email"), "user@example.com");
    setValue(password, "creat3more");

    act(() => {
      queryButton("Show password").click();
    });
    expect(password.type).toBe("text");
    expect(queryButton("Hide password").getAttribute("aria-pressed")).toBe("true");

    const form = password.closest("form");
    if (!form) throw new Error("Missing sign-in form");
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(signInMock).toHaveBeenCalledWith("user@example.com", "creat3more");

    act(() => {
      queryButton("Hide password").click();
    });
    expect(password.type).toBe("password");
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(signInMock).toHaveBeenCalledTimes(2);
    expect(signInMock).toHaveBeenLastCalledWith("user@example.com", "creat3more");
    expect(window.location.search).not.toContain("creat3more");
    expect(JSON.stringify(localStorage)).not.toContain("creat3more");
    expect(JSON.stringify(sessionStorage)).not.toContain("creat3more");
  });

  it("toggles sign-up password and confirm password independently", async () => {
    mount(createElement(ChatLoginForm));
    act(() => {
      queryButton("Sign up").click();
    });

    const password = queryField("Password");
    const confirm = queryField("Confirm password");
    expect(password.type).toBe("password");
    expect(confirm.type).toBe("password");

    setValue(queryField("Email"), "new.user@example.com");
    setValue(password, "creat3more");
    setValue(confirm, "creat3more");

    act(() => {
      queryButton("Show password").click();
    });
    expect(password.type).toBe("text");
    expect(confirm.type).toBe("password");

    act(() => {
      queryButton("Show confirm password").click();
    });
    expect(confirm.type).toBe("text");
    expect(password.type).toBe("text");

    act(() => {
      queryButton("Hide confirm password").click();
    });
    expect(confirm.type).toBe("password");
    expect(password.type).toBe("text");

    const form = password.closest("form");
    if (!form) throw new Error("Missing sign-up form");
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(signUpMock).toHaveBeenCalledWith("new.user@example.com", "creat3more");
    expect(window.location.search).not.toContain("password");
    expect(JSON.stringify(localStorage)).not.toContain("creat3more");
  });
});
