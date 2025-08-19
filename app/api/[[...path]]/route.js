import { NextResponse } from "next/server"
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

// CORS headers
function handleCORS(response) {
  response.headers.set("Access-Control-Allow-Origin", "*")
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
  return response
}

function createSupabaseServer() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Handle cookie setting errors
          }
        },
      },
    }
  )
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

export async function GET(request, { params }) {
  try {
    const url = new URL(request.url)
    const pathParts = params.path || []
    const endpoint = `/${pathParts.join("/")}`
    const searchParams = url.searchParams
    
    const supabase = createSupabaseServer()

    // Public endpoint - get user profile by username
    if (endpoint.startsWith("/public/profile/")) {
      const username = endpoint.split("/public/profile/")[1]
      
      if (!username) {
        return handleCORS(NextResponse.json({ error: "Username required" }, { status: 400 }))
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()

      if (profileError || !profile) {
        return handleCORS(NextResponse.json({ error: "Profile not found" }, { status: 404 }))
      }

      // Get user's links
      const { data: links, error: linksError } = await supabase
        .from('links')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      if (linksError) {
        return handleCORS(NextResponse.json({ error: "Failed to fetch links" }, { status: 500 }))
      }

      return handleCORS(NextResponse.json({
        profile: {
          username: profile.username,
          display_name: profile.display_name,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
          theme_color: profile.theme_color,
          background_color: profile.background_color
        },
        links: links || []
      }))
    }

    // Protected routes - require authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user) {
      return handleCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }))
    }

    // Get current user profile
    if (endpoint === "/profile") {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        return handleCORS(NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 }))
      }

      return handleCORS(NextResponse.json(profile || { id: user.id, email: user.email }))
    }

    // Get user's links
    if (endpoint === "/links") {
      const { data: links, error } = await supabase
        .from('links')
        .select('*')
        .eq('user_id', user.id)
        .order('order_index', { ascending: true })

      if (error) {
        return handleCORS(NextResponse.json({ error: "Failed to fetch links" }, { status: 500 }))
      }

      return handleCORS(NextResponse.json(links || []))
    }

    return handleCORS(NextResponse.json({ error: "Endpoint not found" }, { status: 404 }))
  } catch (error) {
    console.error("GET Error:", error)
    return handleCORS(NextResponse.json({ error: "Internal server error" }, { status: 500 }))
  }
}

export async function POST(request, { params }) {
  try {
    const pathParts = params.path || []
    const endpoint = `/${pathParts.join("/")}`
    const body = await request.json()
    
    const supabase = createSupabaseServer()

    // Auth endpoints
    if (endpoint === "/auth/signup") {
      const { email, password, username, displayName } = body

      if (!email || !password || !username || !displayName) {
        return handleCORS(NextResponse.json({ error: "Missing required fields" }, { status: 400 }))
      }

      // Check if username is already taken
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.toLowerCase())
        .single()

      if (existingProfile) {
        return handleCORS(NextResponse.json({ error: "Username already taken" }, { status: 400 }))
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.toLowerCase(),
            display_name: displayName
          }
        }
      })

      if (error) {
        return handleCORS(NextResponse.json({ error: error.message }, { status: 400 }))
      }

      // Create profile
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username: username.toLowerCase(),
            display_name: displayName,
            email: email,
            created_at: new Date().toISOString()
          })

        if (profileError) {
          console.error("Profile creation error:", profileError)
        }
      }

      return handleCORS(NextResponse.json({ user: data.user }))
    }

    if (endpoint === "/auth/signin") {
      const { email, password } = body

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return handleCORS(NextResponse.json({ error: error.message }, { status: 400 }))
      }

      return handleCORS(NextResponse.json({ user: data.user }))
    }

    if (endpoint === "/auth/signout") {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        return handleCORS(NextResponse.json({ error: error.message }, { status: 400 }))
      }

      return handleCORS(NextResponse.json({ success: true }))
    }

    // Track link click
    if (endpoint === "/track-click") {
      const { linkId, userId } = body
      
      if (!linkId) {
        return handleCORS(NextResponse.json({ error: "Link ID required" }, { status: 400 }))
      }

      // Increment click count
      const { error } = await supabase
        .from('links')
        .update({ 
          click_count: supabase.rpc('increment_clicks', { link_id: linkId })
        })
        .eq('id', linkId)

      if (error) {
        console.error("Click tracking error:", error)
      }

      return handleCORS(NextResponse.json({ success: true }))
    }

    // Protected routes - require authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user) {
      return handleCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }))
    }

    // Update profile
    if (endpoint === "/profile") {
      const { username, displayName, bio, avatarUrl, themeColor, backgroundColor } = body

      // Check username uniqueness if changing username
      if (username) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username.toLowerCase())
          .neq('id', user.id)
          .single()

        if (existingProfile) {
          return handleCORS(NextResponse.json({ error: "Username already taken" }, { status: 400 }))
        }
      }

      const updateData = {}
      if (username) updateData.username = username.toLowerCase()
      if (displayName) updateData.display_name = displayName
      if (bio !== undefined) updateData.bio = bio
      if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl
      if (themeColor) updateData.theme_color = themeColor
      if (backgroundColor) updateData.background_color = backgroundColor
      updateData.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        return handleCORS(NextResponse.json({ error: "Failed to update profile" }, { status: 500 }))
      }

      return handleCORS(NextResponse.json(data))
    }

    // Create link
    if (endpoint === "/links") {
      const { title, url, description } = body

      if (!title || !url) {
        return handleCORS(NextResponse.json({ error: "Title and URL required" }, { status: 400 }))
      }

      // Get max order index for user
      const { data: maxOrderResult } = await supabase
        .from('links')
        .select('order_index')
        .eq('user_id', user.id)
        .order('order_index', { ascending: false })
        .limit(1)

      const nextOrderIndex = maxOrderResult?.[0]?.order_index + 1 || 0

      const { data, error } = await supabase
        .from('links')
        .insert({
          id: uuidv4(),
          user_id: user.id,
          title,
          url,
          description: description || null,
          order_index: nextOrderIndex,
          is_active: true,
          click_count: 0,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        return handleCORS(NextResponse.json({ error: "Failed to create link" }, { status: 500 }))
      }

      return handleCORS(NextResponse.json(data))
    }

    return handleCORS(NextResponse.json({ error: "Endpoint not found" }, { status: 404 }))
  } catch (error) {
    console.error("POST Error:", error)
    return handleCORS(NextResponse.json({ error: "Internal server error" }, { status: 500 }))
  }
}

export async function PUT(request, { params }) {
  try {
    const pathParts = params.path || []
    const endpoint = `/${pathParts.join("/")}`
    const body = await request.json()
    
    const supabase = createSupabaseServer()

    // Protected routes - require authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user) {
      return handleCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }))
    }

    // Update link
    if (endpoint.startsWith("/links/")) {
      const linkId = endpoint.split("/links/")[1]
      const { title, url, description, isActive } = body

      const updateData = {}
      if (title) updateData.title = title
      if (url) updateData.url = url
      if (description !== undefined) updateData.description = description
      if (isActive !== undefined) updateData.is_active = isActive
      updateData.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('links')
        .update(updateData)
        .eq('id', linkId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        return handleCORS(NextResponse.json({ error: "Failed to update link" }, { status: 500 }))
      }

      return handleCORS(NextResponse.json(data))
    }

    // Reorder links
    if (endpoint === "/links/reorder") {
      const { linkIds } = body

      if (!Array.isArray(linkIds)) {
        return handleCORS(NextResponse.json({ error: "linkIds must be an array" }, { status: 400 }))
      }

      // Update order indices
      const updates = linkIds.map((linkId, index) => 
        supabase
          .from('links')
          .update({ order_index: index, updated_at: new Date().toISOString() })
          .eq('id', linkId)
          .eq('user_id', user.id)
      )

      await Promise.all(updates)

      return handleCORS(NextResponse.json({ success: true }))
    }

    return handleCORS(NextResponse.json({ error: "Endpoint not found" }, { status: 404 }))
  } catch (error) {
    console.error("PUT Error:", error)
    return handleCORS(NextResponse.json({ error: "Internal server error" }, { status: 500 }))
  }
}

export async function DELETE(request, { params }) {
  try {
    const pathParts = params.path || []
    const endpoint = `/${pathParts.join("/")}`
    
    const supabase = createSupabaseServer()

    // Protected routes - require authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user) {
      return handleCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }))
    }

    // Delete link
    if (endpoint.startsWith("/links/")) {
      const linkId = endpoint.split("/links/")[1]

      const { error } = await supabase
        .from('links')
        .delete()
        .eq('id', linkId)
        .eq('user_id', user.id)

      if (error) {
        return handleCORS(NextResponse.json({ error: "Failed to delete link" }, { status: 500 }))
      }

      return handleCORS(NextResponse.json({ success: true }))
    }

    return handleCORS(NextResponse.json({ error: "Endpoint not found" }, { status: 404 }))
  } catch (error) {
    console.error("DELETE Error:", error)
    return handleCORS(NextResponse.json({ error: "Internal server error" }, { status: 500 }))
  }
}