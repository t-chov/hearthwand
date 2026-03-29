import { describe, expect, it, vi } from "vitest";

import { PING_RESPONSE, pingCommand } from "../src/commands/ping.js";

describe("pingCommand", () => {
  it("defines the /ping command", () => {
    expect(pingCommand.data.toJSON()).toMatchObject({
      name: "ping",
      description: "Return PONG.",
    });
  });

  it("replies with PONG", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);

    await pingCommand.execute({ reply } as never);

    expect(reply).toHaveBeenCalledWith(PING_RESPONSE);
  });
});
