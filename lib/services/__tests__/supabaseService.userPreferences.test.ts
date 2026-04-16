jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

jest.mock('../privacyService', () => ({
  privacyService: {
    decryptData: jest.fn(),
    encryptData: jest.fn(),
  },
}))

import { supabase } from '@/lib/supabaseClient'
import { fetchUserPreferences } from '../supabaseService'

describe('supabaseService user preferences', () => {
  const userId = '123e4567-e89b-12d3-a456-426614174000'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns default preferences when no user preferences row exists', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: null,
      error: null,
    })
    const eq = jest.fn().mockReturnValue({ maybeSingle })
    const select = jest.fn().mockReturnValue({ eq })
    ;(supabase.from as jest.Mock).mockReturnValue({ select })

    const result = await fetchUserPreferences(userId)

    expect(supabase.from).toHaveBeenCalledWith('user_preferences')
    expect(select).toHaveBeenCalledWith('*')
    expect(eq).toHaveBeenCalledWith('user_id', userId)
    expect(maybeSingle).toHaveBeenCalled()
    expect(result).toEqual({
      selectedCollectionId: null,
      collectionInput: '',
      hideCollectionName: false,
      copyFormat: 'PNG',
      gradientStartColor: null,
      gradientEndColor: null,
      dotColorDiscovery: '#b0cdfb',
      dotColorUpslope: '#a6e7be',
      dotColorDangerZone: '#f8b4b4',
      dotColorDownslope: '#fcc7a1',
      dotColorDone: '#d0bdfb',
      splitHillAreaFillEnabled: false,
      showTodayCollection: true,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    })
  })
})
