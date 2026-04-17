import { fetchCollections } from "../demoLocalDataService"

describe("demoLocalDataService", () => {
  const userId = "demo-local-user"

  beforeEach(() => {
    window.localStorage.clear()
  })

  it("returns seeded demo collections with starter dots for first-time users", async () => {
    const collections = await fetchCollections(userId)

    expect(collections.length).toBeGreaterThanOrEqual(2)
    expect(collections.every((collection) => collection.dots.length > 0)).toBe(true)
  })
})
