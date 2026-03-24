import { simpleDataService } from '../simpleDataService'
import * as supabaseService from '../supabaseService'

jest.mock('../supabaseService')

const mockSupabaseService = supabaseService as jest.Mocked<typeof supabaseService>

describe('SimpleDataService - User Preferences', () => {
  const userId = '123e4567-e89b-12d3-a456-426614174000'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('fetchUserPreferences should call supabase service', async () => {
    mockSupabaseService.fetchUserPreferences.mockResolvedValue({
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
      createdAt: '2026-03-23T00:00:00.000Z',
      updatedAt: '2026-03-23T00:00:00.000Z',
    })

    const result = await simpleDataService.fetchUserPreferences(userId)

    expect(mockSupabaseService.fetchUserPreferences).toHaveBeenCalledWith(userId)
    expect(result?.showTodayCollection).toBe(true)
  })

  it('updateUserPreferences should call upsertUserPreferences', async () => {
    mockSupabaseService.upsertUserPreferences.mockResolvedValue(true)

    const payload = {
      selectedCollectionId: 'today-user-1',
      collectionInput: 'Team A',
      hideCollectionName: true,
      copyFormat: 'SVG' as const,
      gradientStartColor: '#112233',
      gradientEndColor: '#445566',
      dotColorDiscovery: '#123456',
      dotColorUpslope: '#234567',
      dotColorDangerZone: '#345678',
      dotColorDownslope: '#456789',
      dotColorDone: '#56789a',
      splitHillAreaFillEnabled: true,
      showTodayCollection: false,
    }

    const result = await simpleDataService.updateUserPreferences(userId, payload)

    expect(mockSupabaseService.upsertUserPreferences).toHaveBeenCalledWith(userId, payload)
    expect(result).toBe(true)
  })
})
