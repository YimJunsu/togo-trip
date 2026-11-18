import type { RequestRepository } from '../repositories'
import type { UserRequest } from '../types'
import { store } from './store'

export const mockRequestRepo: RequestRepository = {
  async create(input) {
    const request: UserRequest = {
      // Date.now()만 쓰면 같은 밀리초에 두 번 부를 때 id가 겹친다.
      id: `req-${Date.now()}-${store.requests.length}`,
      userId: input.author.id,
      authorName: input.author.name,
      authorEmail: input.author.email,
      kind: input.kind,
      content: input.content,
      status: 'open',
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    }
    store.requests.push(request)
    return request
  },

  async listAll() {
    return [...store.requests].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )
  },

  async listMine(userId) {
    return store.requests
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20)
  },

  async setStatus(id, status) {
    const found = store.requests.find((r) => r.id === id)
    if (!found) return
    found.status = status
    found.resolvedAt = status === 'done' ? new Date().toISOString() : null
  },
}
