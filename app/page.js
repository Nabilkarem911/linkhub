'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Eye, User, Plus, Edit, Trash2, GripVertical, ExternalLink, BarChart3 } from "lucide-react"

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authMode, setAuthMode] = useState('signin')
  const [profile, setProfile] = useState(null)
  const [links, setLinks] = useState([])
  const [showAddLink, setShowAddLink] = useState(false)
  const [editingLink, setEditingLink] = useState(null)
  const [activeTab, setActiveTab] = useState('links')

  // Form states
  const [authForm, setAuthForm] = useState({ email: '', password: '', username: '', displayName: '' })
  const [profileForm, setProfileForm] = useState({ 
    username: '', 
    displayName: '', 
    bio: '', 
    avatarUrl: '',
    themeColor: '#3b82f6',
    backgroundColor: '#ffffff'
  })
  const [linkForm, setLinkForm] = useState({ title: '', url: '', description: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      setLoading(false)
      
      if (session?.user) {
        await loadProfile()
        await loadLinks()
      }
    }
    
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null)
        if (session?.user) {
          await loadProfile()
          await loadLinks()
        } else {
          setProfile(null)
          setLinks([])
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        setProfileForm({
          username: data.username || '',
          displayName: data.display_name || '',
          bio: data.bio || '',
          avatarUrl: data.avatar_url || '',
          themeColor: data.theme_color || '#3b82f6',
          backgroundColor: data.background_color || '#ffffff'
        })
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    }
  }

  const loadLinks = async () => {
    try {
      const response = await fetch('/api/links')
      if (response.ok) {
        const data = await response.json()
        setLinks(data)
      }
    } catch (error) {
      console.error('Failed to load links:', error)
    }
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const endpoint = authMode === 'signin' ? '/api/auth/signin' : '/api/auth/signup'
      const body = authMode === 'signin' 
        ? { email: authForm.email, password: authForm.password }
        : authForm

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Authentication failed')
        return
      }

      if (authMode === 'signup') {
        setSuccess('Account created successfully! Please check your email to verify your account.')
      }
      
      setAuthForm({ email: '', password: '', username: '', displayName: '' })
    } catch (error) {
      setError('Authentication failed')
    }
  }

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: profileForm.username,
          displayName: profileForm.displayName,
          bio: profileForm.bio,
          avatarUrl: profileForm.avatarUrl,
          themeColor: profileForm.themeColor,
          backgroundColor: profileForm.backgroundColor
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to update profile')
        return
      }

      setProfile(data)
      setSuccess('Profile updated successfully!')
    } catch (error) {
      setError('Failed to update profile')
    }
  }

  const handleAddLink = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(linkForm)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to add link')
        return
      }

      setLinks([...links, data])
      setLinkForm({ title: '', url: '', description: '' })
      setShowAddLink(false)
    } catch (error) {
      setError('Failed to add link')
    }
  }

  const handleEditLink = async (e) => {
    e.preventDefault()
    if (!editingLink) return

    try {
      const response = await fetch(`/api/links/${editingLink.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(linkForm)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to update link')
        return
      }

      setLinks(links.map(link => link.id === editingLink.id ? data : link))
      setEditingLink(null)
      setLinkForm({ title: '', url: '', description: '' })
    } catch (error) {
      setError('Failed to update link')
    }
  }

  const handleDeleteLink = async (linkId) => {
    try {
      const response = await fetch(`/api/links/${linkId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setLinks(links.filter(link => link.id !== linkId))
      }
    } catch (error) {
      console.error('Failed to delete link:', error)
    }
  }

  const startEditLink = (link) => {
    setEditingLink(link)
    setLinkForm({
      title: link.title,
      url: link.url,
      description: link.description || ''
    })
  }

  const cancelEdit = () => {
    setEditingLink(null)
    setLinkForm({ title: '', url: '', description: '' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              {authMode === 'signin' ? 'Sign In' : 'Create Account'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}
            
            <form onSubmit={handleAuth} className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={authForm.email}
                onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                required
              />
              <Input
                type="password"
                placeholder="Password"
                value={authForm.password}
                onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                required
              />
              
              {authMode === 'signup' && (
                <>
                  <Input
                    type="text"
                    placeholder="Username (e.g. johndoe)"
                    value={authForm.username}
                    onChange={(e) => setAuthForm({...authForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')})}
                    required
                  />
                  <Input
                    type="text"
                    placeholder="Display Name"
                    value={authForm.displayName}
                    onChange={(e) => setAuthForm({...authForm, displayName: e.target.value})}
                    required
                  />
                </>
              )}
              
              <Button type="submit" className="w-full">
                {authMode === 'signin' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="text-center">
              <button
                onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                className="text-blue-600 hover:underline"
              >
                {authMode === 'signin' 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Sign in"
                }
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">LinkFolio</h1>
            </div>
            <div className="flex items-center space-x-4">
              {profile?.username && (
                <a
                  href={`/u/${profile.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-sm text-gray-600 hover:text-blue-600"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Public Profile
                </a>
              )}
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-sm text-gray-600">{user.email}</span>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Tab Navigation */}
        <div className="flex space-x-4 mb-8 border-b">
          <button
            onClick={() => setActiveTab('links')}
            className={`pb-2 px-1 ${activeTab === 'links' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            My Links
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2 px-1 ${activeTab === 'profile' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Profile Settings
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {activeTab === 'profile' && (
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <Input
                    type="text"
                    placeholder="Username"
                    value={profileForm.username}
                    onChange={(e) => setProfileForm({...profileForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')})}
                  />
                  {profileForm.username && (
                    <p className="text-xs text-gray-500 mt-1">
                      Your public URL: {process.env.NEXT_PUBLIC_BASE_URL}/u/{profileForm.username}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Display Name"
                    value={profileForm.displayName}
                    onChange={(e) => setProfileForm({...profileForm, displayName: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <Textarea
                    placeholder="Tell people about yourself..."
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Avatar URL (optional)
                  </label>
                  <Input
                    type="url"
                    placeholder="https://example.com/your-photo.jpg"
                    value={profileForm.avatarUrl}
                    onChange={(e) => setProfileForm({...profileForm, avatarUrl: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Theme Color
                    </label>
                    <Input
                      type="color"
                      value={profileForm.themeColor}
                      onChange={(e) => setProfileForm({...profileForm, themeColor: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Background Color
                    </label>
                    <Input
                      type="color"
                      value={profileForm.backgroundColor}
                      onChange={(e) => setProfileForm({...profileForm, backgroundColor: e.target.value})}
                    />
                  </div>
                </div>

                <Button type="submit">Update Profile</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === 'links' && (
          <div className="space-y-6">
            {/* Add Link Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>My Links</CardTitle>
                <Button
                  onClick={() => setShowAddLink(!showAddLink)}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Link
                </Button>
              </CardHeader>
              
              {showAddLink && (
                <CardContent>
                  <form onSubmit={handleAddLink} className="space-y-4">
                    <Input
                      type="text"
                      placeholder="Link title"
                      value={linkForm.title}
                      onChange={(e) => setLinkForm({...linkForm, title: e.target.value})}
                      required
                    />
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      value={linkForm.url}
                      onChange={(e) => setLinkForm({...linkForm, url: e.target.value})}
                      required
                    />
                    <Input
                      type="text"
                      placeholder="Description (optional)"
                      value={linkForm.description}
                      onChange={(e) => setLinkForm({...linkForm, description: e.target.value})}
                    />
                    <div className="flex gap-2">
                      <Button type="submit">Add Link</Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowAddLink(false)
                          setLinkForm({ title: '', url: '', description: '' })
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              )}
            </Card>

            {/* Links List */}
            <div className="space-y-3">
              {links.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-500">No links yet. Add your first link above!</p>
                  </CardContent>
                </Card>
              ) : (
                links.map(link => (
                  <Card key={link.id} className="relative">
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center space-x-3">
                        <GripVertical className="w-4 h-4 text-gray-400" />
                        <div className="flex-1">
                          {editingLink?.id === link.id ? (
                            <form onSubmit={handleEditLink} className="space-y-2">
                              <Input
                                value={linkForm.title}
                                onChange={(e) => setLinkForm({...linkForm, title: e.target.value})}
                                placeholder="Link title"
                                required
                              />
                              <Input
                                value={linkForm.url}
                                onChange={(e) => setLinkForm({...linkForm, url: e.target.value})}
                                placeholder="https://example.com"
                                required
                              />
                              <Input
                                value={linkForm.description}
                                onChange={(e) => setLinkForm({...linkForm, description: e.target.value})}
                                placeholder="Description (optional)"
                              />
                              <div className="flex gap-2">
                                <Button type="submit" size="sm">Save</Button>
                                <Button type="button" variant="outline" size="sm" onClick={cancelEdit}>
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <h3 className="font-medium text-gray-900">{link.title}</h3>
                              <p className="text-sm text-blue-600 hover:underline">
                                <a href={link.url} target="_blank" rel="noopener noreferrer">
                                  {link.url}
                                </a>
                              </p>
                              {link.description && (
                                <p className="text-sm text-gray-600">{link.description}</p>
                              )}
                              <div className="flex items-center mt-2 space-x-4">
                                <Badge variant="secondary" className="text-xs">
                                  <BarChart3 className="w-3 h-3 mr-1" />
                                  {link.click_count || 0} clicks
                                </Badge>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {editingLink?.id !== link.id && (
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditLink(link)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLink(link.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <a 
                            href={link.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-gray-100 rounded"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}