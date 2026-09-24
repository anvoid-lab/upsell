import { describe, expect, it } from "vitest";

import { ContactContract } from "../../core/contracts/contact.contract";

describe("ContactContract", () => {
  it("preserves an avatar URL stored inside the conversation contact object", () => {
    const avatarUrl =
      "https://scontent-lis1-1.cdninstagram.com/profile-picture.jpg?stp=dst-jpg_s150x150&ccb=7-5";

    const contact = ContactContract.entitySchema.parse({
      id: "instagram-user-1",
      name: "Instagram User",
      initials: "IU",
      avatar_bg: "#fce7f3",
      avatar_color: "#be185d",
      avatar_url: avatarUrl,
      platform: "instagram",
      first_contact: "2026-09-13T00:00:00.000Z",
      status: "new",
    });

    expect(contact.avatar_url).toBe(avatarUrl);
  });
});
