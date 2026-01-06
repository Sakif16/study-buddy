import { useEffect, useState } from "react"

type ChatMessage = {
  id: string
  author: string
  text: string
  time: string
  self?: boolean
}

export default function GroupStudy() {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [invitations, setInvitations] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [sentInvitations, setSentInvitations] = useState<any[]>([])
  const [groupMembers, setGroupMembers] = useState<string[]>([])
  const [newGroupName, setNewGroupName] = useState("")
  const [inviteUsername, setInviteUsername] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const send = () => {
    const t = input.trim()
    if (!t) return
    const now = new Date()
    const time = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
    // post to backend if group selected
    if (selectedGroup) {
      fetch(`http://localhost:3000/groups/${selectedGroup}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: t }),
      })
        .then((r) => r.json())
        .then((body) => {
          if (body?.success && body.message) {
            const m = body.message
            const author = m.sender?.username ?? (m.senderId === currentUserId ? "You" : "")
            const isSelf = (m.sender && m.sender.id === currentUserId) || m.senderId === currentUserId
            setMessages((s) => [
              ...s,
              { id: m.id, author: author || "You", text: m.content, time, self: !!isSelf },
            ])
          }
        })
        .catch(() => { })
    } else {
      setMessages((s) => [
        ...s,
        { id: String(Date.now()), author: "You", text: t, time, self: true },
      ])
    }
    setInput("")
  }

  const sendFile = (file: File | null) => {
    if (!file) return
    if (!selectedGroup) return
    const form = new FormData()
    form.append('file', file)
    fetch(`http://localhost:3000/groups/${selectedGroup}/upload`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    })
      .then((r) => r.json())
      .then((body) => {
        if (body?.success && body.message) {
          const m = body.message
          const author = m.sender?.username ?? (m.senderId === currentUserId ? "You" : "")
          const isSelf = (m.sender && m.sender.id === currentUserId) || m.senderId === currentUserId
          setMessages((s) => [
            ...s,
            { id: m.id, author: author || 'You', text: m.content, time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), self: !!isSelf },
          ])
        }
      })
      .catch(() => { })
  }

  const loadGroups = async () => {
    try {
      const res = await fetch("http://localhost:3000/groups", { credentials: "include" })
      if (!res.ok) return
      const body = await res.json()
      if (body?.success && Array.isArray(body.groups)) setGroups(body.groups)
    } catch { }
  }

  const loadInvitations = async () => {
    try {
      const res = await fetch("http://localhost:3000/groups/invitations", { credentials: "include" })
      if (!res.ok) return
      const body = await res.json()
      if (body?.success && Array.isArray(body.invitations)) setInvitations(body.invitations)
    } catch { }
  }

  const createGroup = async () => {
    if (!newGroupName.trim()) return
    try {
      const res = await fetch("http://localhost:3000/groups", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName.trim() }),
      })
      const body = await res.json()
      if (body?.success) {
        setNewGroupName("")
        loadGroups()
      }
    } catch { }
  }

  const sendInvite = async (groupId: string, toUserId: string) => {
    try {
      const res = await fetch(`http://localhost:3000/groups/${groupId}/invite`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId }),
      })
      const body = await res.json()
      if (body?.success) {
        loadSentInvitations()
      }
    } catch { }
  }

  const loadUsers = async () => {
    try {
      const res = await fetch("http://localhost:3000/groups/users", { credentials: "include" })
      if (!res.ok) return
      const body = await res.json()
      if (body?.success && Array.isArray(body.users)) setUsers(body.users)
    } catch { }
  }

  const loadSentInvitations = async () => {
    try {
      const res = await fetch("http://localhost:3000/groups/invitations/sent", { credentials: "include" })
      if (!res.ok) return
      const body = await res.json()
      if (body?.success && Array.isArray(body.invitations)) setSentInvitations(body.invitations)
    } catch { }
  }

  const acceptInvite = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:3000/groups/invitations/${id}/accept`, {
        method: "POST",
        credentials: "include",
      })
      const body = await res.json()
      if (body?.success) {
        loadInvitations()
        loadGroups()
        loadSentInvitations()
      }
    } catch { }
  }

  const declineInvite = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:3000/groups/invitations/${id}/decline`, {
        method: "POST",
        credentials: "include",
      })
      const body = await res.json()
      if (body?.success) {
        loadInvitations()
        loadSentInvitations()
      }
    } catch { }
  }

  const loadMessages = async (groupId: string) => {
    try {
      const res = await fetch(`http://localhost:3000/groups/${groupId}/messages`, { credentials: "include" })
      if (!res.ok) return
      const body = await res.json()
      if (body?.success && Array.isArray(body.messages)) {
        const mapped: ChatMessage[] = body.messages.map((m: any) => ({
          id: m.id,
          author: m.sender?.username ?? "",
          text: m.content,
          time: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          self: m.sender?.id === currentUserId,
        }))
        setMessages(mapped)
      }
    } catch { }
  }

  useEffect(() => {
    loadGroups()
    loadInvitations()
    loadUsers()
    loadSentInvitations()
    // get current user id
    fetch("http://localhost:3000/auth", { credentials: "include" })
      .then((r) => r.json())
      .then((b) => {
        if (b?.user?.id) setCurrentUserId(b.user.id)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedGroup) loadMessages(selectedGroup)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup])

  useEffect(() => {
    if (!selectedGroup) {
      setGroupMembers([])
      return
    }
    // load members for selected group so we can hide them from invite list
    fetch(`http://localhost:3000/groups/${selectedGroup}/members`, { credentials: "include" })
      .then((r) => r.json())
      .then((b) => {
        if (b?.success && Array.isArray(b.users)) setGroupMembers(b.users.map((u: any) => u.id))
      })
      .catch(() => { })
  }, [selectedGroup])

  return (
    <div className="p-8 text-white">
      <h2 className="text-2xl font-semibold text-white mb-6">Group Study</h2>

      <div className="max-w-6xl mx-auto rounded-lg shadow-lg overflow-hidden bg-[#08917e] flex">
        <aside className="w-80 p-4 border-r border-white/20">
          <div className="mb-4">
            <div className="text-white font-bold">Your Groups</div>
            <div className="mt-2 space-y-2">
              {groups.length === 0 ? (
                <div className="text-sm text-white/60">You have no groups</div>
              ) : (
                groups.map((g) => (
                  <div key={g.id} className="flex items-center justify-between">
                    <button
                      className={`text-left text-white flex-1 px-2 py-1 rounded ${selectedGroup === g.id ? "bg-white/20" : ""}`}
                      onClick={() => setSelectedGroup(g.id)}
                    >
                      {g.name}
                    </button>
                    <div className="text-xs text-white/70 ml-2">{g.ownerId === currentUserId ? "Owner" : ""}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mb-4">
            <div className="text-white font-semibold">Create Group</div>
            <div className="mt-2 flex gap-2">
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group name"
                className="flex-1 px-2 py-1 rounded bg-white/10 text-white outline-none"
              />
              <button type="button" onClick={createGroup} className="px-3 py-1 bg-white text-black rounded">Create</button>
            </div>
          </div>

          <div>
            <div className="text-white font-semibold">Invitations</div>
            <div className="mt-2 space-y-2">
              {invitations.length === 0 ? (
                <div className="text-sm text-white/60">No invitations</div>
              ) : (
                invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between bg-white/5 p-2 rounded">
                    <div className="text-sm">
                      <div className="font-semibold">{inv.group?.name}</div>
                      <div className="text-xs text-white/70">From: {inv.from?.username}</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => acceptInvite(inv.id)} className="px-2 py-1 bg-[#1BECC9] text-black rounded text-sm">Accept</button>
                        <button type="button" onClick={() => declineInvite(inv.id)} className="px-2 py-1 bg-red-500 text-white rounded text-sm">Decline</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-white font-semibold">Invite Users</div>
            <div className="mt-2">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users to invite"
                className="w-full px-3 py-2 rounded bg-white/10 text-white outline-none"
                disabled={!selectedGroup}
              />
            </div>
            <div className="mt-2 space-y-2 max-h-40 overflow-auto">
              {users.length === 0 ? (
                <div className="text-sm text-white/60">No other users</div>
              ) : (
                (() => {
                  const base = users.filter((u) => {
                    if (selectedGroup && groupMembers.includes(u.id)) return false
                    const hasPending = sentInvitations.some((inv) => inv.to?.id === u.id && inv.group?.id === selectedGroup && inv.status === "PENDING")
                    return !hasPending
                  })
                  const q = searchQuery.trim().toLowerCase()
                  const matched = q ? base.filter((u) => (u.username || "").toLowerCase().includes(q)) : []

                  if (q && matched.length === 0) {
                    return <div className="text-sm text-white/60">No user found</div>
                  }

                  if (!q) {
                    return <div className="text-sm text-white/60">Type to search users</div>
                  }

                  return matched.map((u) => (
                    <div key={u.id} className="flex items-center justify-between bg-white/5 p-2 rounded">
                      <div className="text-sm text-white">{u.username}</div>
                      <div>
                        <button
                          type="button"
                          onClick={() => selectedGroup && sendInvite(selectedGroup, u.id)}
                          disabled={!selectedGroup}
                          className="px-2 py-1 bg-white text-black rounded text-sm disabled:opacity-50"
                        >
                          Invite
                        </button>
                      </div>
                    </div>
                  ))
                })()
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-white font-semibold">Sent Invitations</div>
            <div className="mt-2 space-y-2">
              {sentInvitations.length === 0 ? (
                <div className="text-sm text-white/60">No sent invitations</div>
              ) : (
                sentInvitations.map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-white/5 p-2 rounded">
                    <div>
                      <div className="font-semibold">To: {s.to?.username}</div>
                      <div className="text-xs text-white/70">Group: {s.group?.name}</div>
                    </div>
                    <div className="text-sm font-medium">{s.status}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        <div className="flex-1 p-4 h-[700px] flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <div className="text-white font-bold">{selectedGroup ? (groups.find(g => g.id === selectedGroup)?.name ?? 'Group') : 'No group selected'}</div>
              <div className="text-sm text-white/80">Chat</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2" id="chat-list">
            {messages.length === 0 ? (
              <div className="text-sm text-white/60">No messages yet — start the conversation.</div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`mb-4 ${m.self ? "text-right" : ""}`}>
                  <div className="text-sm text-white font-semibold">{m.self ? "You" : m.author} • <span className="text-xs text-white/60">{m.time}</span></div>
                  <div className="text-white font-medium mt-1">
                    {(() => {
                      const isFile = typeof m.text === 'string' && (m.text.startsWith('/public/uploads/') || m.text.startsWith('/groups/'))
                      if (!isFile) return m.text
                      const url = `http://localhost:3000${m.text}`
                      const lower = m.text.toLowerCase()
                      if (lower.match(/\.(png|jpe?g|gif|webp|bmp)$/)) {
                        return <img src={url} alt="attachment" className="max-w-xs mx-auto rounded" />
                      }
                      if (lower.endsWith('.pdf')) {
                        return (
                          <a href={url} target="_blank" rel="noreferrer" className="underline text-white/90">Open PDF</a>
                        )
                      }
                      return (
                        <a href={url} target="_blank" rel="noreferrer" className="underline text-white/90">Download file</a>
                      )
                    })()}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={selectedGroup ? "Type a message to the group..." : "Select a group to chat"}
                className="flex-1 px-4 py-3 text-white placeholder-white outline-none border border-gray-300 rounded"
                disabled={!selectedGroup}
              />
              <input
                type="file"
                onChange={(e) => sendFile(e.target.files ? e.target.files[0] : null)}
                disabled={!selectedGroup}
                className="text-sm text-white"
              />
              <button type="button" onClick={send} disabled={!selectedGroup} className="px-4 py-2 bg-[#1BECC9] text-black rounded-lg font-semibold">Send</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
