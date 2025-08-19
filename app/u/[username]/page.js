'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ExternalLink, Heart, User } from "lucide-react"
import { useParams } from 'next/navigation'

export default function PublicProfile() {
  const params = useParams()
  const username = params.username
  
  const [profile, setProfile] = useState(null)
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (username) {
      loadProfile()
    }
  }, [username])

  const loadProfile = async () => {
    try {
      const response = await fetch(`/api/public/profile/${username}`)
      
      if (response.status === 404) {
        setNotFound(true)
        setLoading(false)
        return
      }
      
      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
        setLinks(data.links)
      } else {
        setNotFound(true)
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  const handleLinkClick = async (link) => {
    // Track click
    try {
      await fetch('/api/track-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId: link.id, userId: profile?.id })
      })
    } catch (error) {
      console.error('Failed to track click:', error)
    }

    // Open link
    window.open(link.url, '_blank', 'noopener,noreferrer')
  }

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#f8fafc' }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
          <p className="text-gray-600 mb-4">
            The user @{username} doesn't exist or their profile is not public.
          </p>
          <Button 
            onClick={() => window.location.href = '/'}
            variant="outline"
          >
            Go to Homepage
          </Button>
        </div>
      </div>
    )
  }

  const backgroundColor = profile?.background_color || '#ffffff'
  const themeColor = profile?.theme_color || '#3b82f6'

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor }}
    >
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="text-center mb-8">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4"
              style={{ borderColor: themeColor }}
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
          ) : (
            <div 
              className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center border-4"
              style={{ borderColor: themeColor, backgroundColor: themeColor + '20' }}
            >
              <User className="w-8 h-8" style={{ color: themeColor }} />
            </div>
          )}
          
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {profile?.display_name || `@${username}`}
          </h1>
          
          <p className="text-gray-600 mb-2">@{username}</p>
          
          {profile?.bio && (
            <p className="text-gray-700 text-sm leading-relaxed max-w-sm mx-auto">
              {profile.bio}
            </p>
          )}
        </div>

        {/* Links */}
        <div className="space-y-3 mb-8">
          {links.length === 0 ? (
            <Card className="p-6">
              <div className="text-center text-gray-500">
                <p>No links available yet.</p>
              </div>
            </Card>
          ) : (
            links.map(link => (
              <Button
                key={link.id}
                variant="outline"
                className="w-full h-auto p-4 flex items-center justify-between hover:scale-105 transition-transform duration-200"
                style={{ 
                  borderColor: themeColor + '40',
                  '--hover-bg': themeColor + '10'
                }}
                onClick={() => handleLinkClick(link)}
              >
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900 mb-1">
                    {link.title}
                  </div>
                  {link.description && (
                    <div className="text-sm text-gray-600">
                      {link.description}
                    </div>
                  )}
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
              </Button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <div className="flex items-center justify-center gap-1 mb-2">
            <span>Made with</span>
            <Heart className="w-3 h-3 text-red-500 fill-current" />
            <span>using LinkFolio</span>
          </div>
          <p>Create your own link-in-bio page</p>
        </div>
      </div>
    </div>
  )
}