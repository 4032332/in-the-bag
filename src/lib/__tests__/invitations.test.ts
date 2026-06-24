import { acceptInvitationByToken } from '../invitations'
import { supabase } from '../supabase'

jest.mock('../supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}))

describe('acceptInvitationByToken', () => {
  beforeEach(() => jest.clearAllMocks())

  it('throws for missing or short token', async () => {
    await expect(acceptInvitationByToken('')).rejects.toThrow('Invalid invitation token')
    await expect(acceptInvitationByToken('123')).rejects.toThrow('Invalid invitation token')
  })

  it('throws if not authenticated', async () => {
    ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } })
    await expect(acceptInvitationByToken('valid-token-here')).rejects.toThrow('Must be logged in')
  })

  it('succeeds and returns groupId on valid token — Scenario A', async () => {
    ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user-1' } } })
    ;(supabase.rpc as jest.Mock).mockResolvedValue({ data: { group_id: 'group-abc' }, error: null })

    const result = await acceptInvitationByToken('valid-uuid-token-here')

    expect(result.groupId).toBe('group-abc')
    expect(supabase.rpc).toHaveBeenCalledWith('accept_family_invitation', { p_token: 'valid-uuid-token-here' })
  })

  it('throws "Invitation is accepted" for already-used token — Scenario C', async () => {
    ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user-1' } } })
    ;(supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Invitation is accepted' },
    })

    await expect(acceptInvitationByToken('valid-uuid-token-here')).rejects.toThrow('Invitation is accepted')
  })

  it('throws "Invitation has expired" for expired token — Scenario D', async () => {
    ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user-1' } } })
    ;(supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Invitation has expired' },
    })

    await expect(acceptInvitationByToken('valid-uuid-token-here')).rejects.toThrow('Invitation has expired')
  })

  it('throws "Invitation not found" for unknown token — Scenario E', async () => {
    ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user-1' } } })
    ;(supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Invitation not found' },
    })

    await expect(acceptInvitationByToken('unknown-token-here')).rejects.toThrow('Invitation not found')
  })
})
