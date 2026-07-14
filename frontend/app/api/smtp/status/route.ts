import net from "node:net";
import tls from "node:tls";

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type SmtpCheckConfig = {
  host: string;
  port: number;
  username: string;
  appPassword: string;
};

function normalizeConfig(body: Partial<Record<string, unknown>>): SmtpCheckConfig {
  const fromEmail = String(body.fromEmail || process.env.SMTP_FROM || "");
  const host = String(body.host || process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const port = Number(body.port || process.env.SMTP_PORT || 587);
  const username = String(
    body.username || body.fromEmail || process.env.SMTP_USERNAME || process.env.SMTP_USER || fromEmail,
  ).trim();
  const appPassword = String(
    body.appPassword || process.env.SMTP_APP_PASSWORD || process.env.SMTP_PASS || "",
  );

  return { host, port, username, appPassword };
}

function waitForResponse(socket: net.Socket | tls.TLSSocket, timeoutMs = 7000): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("SMTP response timed out."));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      socket.off("data", onData);
      socket.off("error", onError);
    }

    function onError(error: Error) {
      cleanup();
      reject(error);
    }

    function onData(chunk: Buffer) {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const last = lines.at(-1);
      if (last && /^\d{3} /.test(last)) {
        cleanup();
        resolve(buffer);
      }
    }

    socket.on("data", onData);
    socket.on("error", onError);
  });
}

function connectPlain(host: string, port: number, timeoutMs = 7000): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("SMTP connection timed out."));
    }, timeoutMs);

    socket.once("connect", () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function connectTls(host: string, port: number, timeoutMs = 7000): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port, servername: host });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("SMTP TLS connection timed out."));
    }, timeoutMs);

    socket.once("secureConnect", () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function checkRelay(config: SmtpCheckConfig) {
  const socket =
    config.port === 465
      ? await connectTls(config.host, config.port)
      : await connectPlain(config.host, config.port);

  try {
    const greeting = await waitForResponse(socket);
    if (!greeting.startsWith("220")) {
      throw new Error(`SMTP relay returned ${greeting.split(/\r?\n/)[0] || "an invalid greeting"}.`);
    }

    socket.write(`EHLO ldc.local\r\n`);
    const ehlo = await waitForResponse(socket);
    if (!ehlo.startsWith("250")) {
      throw new Error(`SMTP relay rejected EHLO with ${ehlo.split(/\r?\n/)[0] || "an invalid response"}.`);
    }

    socket.write("QUIT\r\n");
    return {
      ok: true,
      host: config.host,
      port: config.port,
      authConfigured: Boolean(config.username && config.appPassword),
      tls: config.port === 465 || /STARTTLS/i.test(ehlo),
    };
  } finally {
    socket.end();
    socket.destroy();
  }
}

export async function POST(request: NextRequest) {
  let body: Partial<Record<string, unknown>> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const config = normalizeConfig(body);
  if (!config.host || !Number.isFinite(config.port) || config.port <= 0) {
    return NextResponse.json({ ok: false, error: "SMTP host and port are required." }, { status: 400 });
  }

  try {
    const status = await checkRelay(config);
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        host: config.host,
        port: config.port,
        error: error instanceof Error ? error.message : "SMTP relay check failed.",
      },
      { status: 502 },
    );
  }
}
