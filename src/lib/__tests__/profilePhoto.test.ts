import { pickAndUploadProfilePhoto } from '../profilePhoto'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { supabase } from '../supabase'

jest.mock('expo-image-picker')
jest.mock('expo-image-manipulator')
jest.mock('../supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn().mockResolvedValue({ error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://fake.url/profile.jpg' } }),
    },
    from: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ error: null }),
  },
}))

// Mock fetch globally
global.fetch = jest.fn().mockResolvedValue({
  blob: jest.fn().mockResolvedValue(new Blob(['fake blob'])),
}) as any

describe('pickAndUploadProfilePhoto', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should request camera permissions and upload photo', async () => {
    ;(ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' })
    ;(ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://fake/image.jpg' }],
    })
    ;(ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({ uri: 'file://fake/manipulated.jpg' })

    const userId = 'user-123'
    const url = await pickAndUploadProfilePhoto(userId, 'camera')

    expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled()
    expect(ImagePicker.launchCameraAsync).toHaveBeenCalled()
    expect(ImageManipulator.manipulateAsync).toHaveBeenCalled()
    expect(supabase.storage.from('user-assets').upload).toHaveBeenCalled()
    expect(supabase.from('users').update).toHaveBeenCalledWith({ profile_photo_url: 'https://fake.url/profile.jpg' })
    expect(url).toBe('https://fake.url/profile.jpg')
  })

  it('should throw if camera permission is denied', async () => {
    ;(ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' })

    await expect(pickAndUploadProfilePhoto('user-123', 'camera')).rejects.toThrow('Camera permission denied')
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled()
  })
})
