import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Heart, Play, Film, Image } from 'lucide-react'
import { feed as feedDb } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { TopBar } from '@/components/layout/TopBar'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Skeleton, EmptyState } from '@/components/ui/Modal'
import toast from 'react-hot-toast'

// ============================================================
// FEED POST CARD
// ============================================================

const FeedCard = ({ post, liked, onLike }) => {
  const isVideo = post.output_type === 'video'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {/* Media */}
      <div className="relative aspect-[9/16] max-h-96 bg-black overflow-hidden">
        <img
          src={post.thumbnail_url}
          alt={post.title || 'Community creation'}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
              <Play size={20} fill="white" className="text-white ml-0.5" />
            </div>
          </div>
        )}
        {/* Type badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full text-xs"
          style={{ background: 'rgba(0,0,0,0.5)', color: 'white', backdropFilter: 'blur(4px)' }}>
          {isVideo ? <Film size={10} /> : <Image size={10} />}
          {isVideo ? 'Video' : 'Image'}
        </div>
      </div>

      {/* Info */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: 'var(--brand)', color: 'white' }}>
            {post.profiles?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}>
              @{post.profiles?.username || 'user'}
            </p>
            {post.templates?.name && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {post.templates.name}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => onLike(post.id)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all"
          style={{
            background: liked ? 'rgba(249,115,22,0.12)' : 'var(--bg-elevated)',
            color: liked ? 'var(--brand)' : 'var(--text-muted)',
          }}
        >
          <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
          <span className="text-xs font-bold">{post.likes_count || 0}</span>
        </button>
      </div>
    </motion.div>
  )
}

// ============================================================
// FEED PAGE
// ============================================================

export default function FeedPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [likedPosts, setLikedPosts] = useState(new Set())
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    loadPosts()
    loadUserLikes()
  }, [])

  const loadPosts = async (offset = 0) => {
    const { data, count } = await feedDb.getPosts({ limit: 20, offset })
    if (data) {
      setPosts(prev => offset === 0 ? data : [...prev, ...data])
      setHasMore((offset + 20) < (count || 0))
    }
    setLoading(false)
  }

  const loadUserLikes = async () => {
    if (!user) return
    const { data } = await feedDb.getUserLikes(user.id)
    setLikedPosts(new Set(data || []))
  }

  const handleLike = async (postId) => {
    if (!user) return toast.error('Sign in to like posts')

    const wasLiked = likedPosts.has(postId)

    // Optimistic update
    setLikedPosts(prev => {
      const next = new Set(prev)
      wasLiked ? next.delete(postId) : next.add(postId)
      return next
    })

    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, likes_count: wasLiked ? p.likes_count - 1 : p.likes_count + 1 }
        : p
    ))

    const { data } = await feedDb.toggleLike(user.id, postId)
    if (!data?.success) {
      // Revert on error
      setLikedPosts(prev => {
        const next = new Set(prev)
        wasLiked ? next.add(postId) : next.delete(postId)
        return next
      })
    }
  }

  return (
    <>
      <TopBar showLogo showCredits />
      <PageWrapper>
        <div className="pt-2 pb-4">
          <h1 className="text-2xl font-black" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
            Community
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Creations from the Meckury community
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="aspect-[9/16] max-h-64" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={Film}
            title="No posts yet"
            description="Be the first to share your creation with the community!"
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {posts.map((post) => (
                <FeedCard
                  key={post.id}
                  post={post}
                  liked={likedPosts.has(post.id)}
                  onLike={handleLike}
                />
              ))}
            </div>

            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => {
                    const nextPage = page + 1
                    setPage(nextPage)
                    loadPosts(nextPage * 20)
                  }}
                  className="px-6 py-3 rounded-2xl text-sm font-semibold transition-colors"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                >
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </PageWrapper>
    </>
  )
}
