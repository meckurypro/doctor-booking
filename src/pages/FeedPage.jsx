// src/pages/FeedPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Play, Film, Image, X } from 'lucide-react'
import { feed as feedDb } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { TopBar } from '@/components/layout/TopBar'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Skeleton, EmptyState } from '@/components/ui/Modal'
import toast from 'react-hot-toast'

// ─── Video Modal ──────────────────────────────────────────

const VideoModal = ({ url, onClose }) => {
  const videoRef = useRef(null)

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.9)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative max-w-sm w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute -top-10 right-0 p-2 rounded-xl text-white"
            aria-label="Close video"
          >
            <X size={20} />
          </button>
          <video
            ref={videoRef}
            src={url}
            controls
            autoPlay
            playsInline
            loop
            className="w-full rounded-3xl"
            style={{ background: '#000', maxHeight: '80vh', objectFit: 'contain' }}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Feed Card ────────────────────────────────────────────

const FeedCard = ({ post, liked, onLike, onPlayVideo }) => {
  const isVideo = post.output_type === 'video'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="relative aspect-[9/16] max-h-96 bg-black overflow-hidden">
        <img
          src={post.thumbnail_url}
          alt={post.title || `Creation by @${post.profiles?.username}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {isVideo && (
          <button
            onClick={() => onPlayVideo(post.output_url)}
            className="absolute inset-0 flex items-center justify-center"
            aria-label={`Play video by @${post.profiles?.username}`}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            >
              <Play size={20} fill="white" className="text-white ml-0.5" />
            </div>
          </button>
        )}
        <div
          className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full text-xs"
          style={{ background: 'rgba(0,0,0,0.5)', color: 'white', backdropFilter: 'blur(4px)' }}
        >
          {isVideo ? <Film size={10} /> : <Image size={10} />}
          {isVideo ? 'Video' : 'Image'}
        </div>
      </div>

      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'var(--brand)', color: 'white' }}
            aria-hidden="true"
          >
            {post.profiles?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}>
              @{post.profiles?.username || 'user'}
            </p>
            {post.templates?.name && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{post.templates.name}</p>
            )}
          </div>
        </div>

        <button
          onClick={() => onLike(post.id)}
          aria-label={liked ? 'Unlike post' : 'Like post'}
          aria-pressed={liked}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all"
          style={{
            background: liked ? 'rgba(249,115,22,0.12)' : 'var(--bg-elevated)',
            color:      liked ? 'var(--brand)' : 'var(--text-muted)',
          }}
        >
          <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
          <span className="text-xs font-bold">{post.likes_count || 0}</span>
        </button>
      </div>
    </motion.div>
  )
}

// ─── Feed Page ────────────────────────────────────────────

const PAGE_SIZE = 20

export default function FeedPage() {
  const { user }                      = useAuth()
  const [posts, setPosts]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [likedPosts, setLikedPosts]   = useState(new Set())
  const [page, setPage]               = useState(0)
  const [hasMore, setHasMore]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [activeVideo, setActiveVideo] = useState(null)

  const loadPosts = useCallback(async (offset = 0, reset = false) => {
    if (offset === 0) setLoading(true)
    else setLoadingMore(true)

    const { data, count } = await feedDb.getPosts({ limit: PAGE_SIZE, offset })

    if (data) {
      setPosts((prev) => reset ? data : [...prev, ...data])
      setHasMore((offset + PAGE_SIZE) < (count || 0))
    }

    setLoading(false)
    setLoadingMore(false)
  }, [])

  const loadUserLikes = useCallback(async () => {
    if (!user) return
    const { data } = await feedDb.getUserLikes(user.id)
    setLikedPosts(new Set(data || []))
  }, [user])

  useEffect(() => {
    loadPosts(0, true)
    loadUserLikes()
  }, [loadPosts, loadUserLikes])

  const handleLike = async (postId) => {
    if (!user) return toast.error('Sign in to like posts')

    const wasLiked = likedPosts.has(postId)

    setLikedPosts((prev) => {
      const next = new Set(prev)
      wasLiked ? next.delete(postId) : next.add(postId)
      return next
    })
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, likes_count: wasLiked ? p.likes_count - 1 : p.likes_count + 1 }
          : p
      )
    )

    const { data } = await feedDb.toggleLike(user.id, postId)

    if (!data?.success) {
      // Revert on failure
      setLikedPosts((prev) => {
        const next = new Set(prev)
        wasLiked ? next.add(postId) : next.delete(postId)
        return next
      })
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, likes_count: wasLiked ? p.likes_count + 1 : p.likes_count - 1 }
            : p
        )
      )
    }
  }

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadPosts(nextPage * PAGE_SIZE)
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
            {Array.from({ length: 6 }).map((_, i) => (
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
                  onPlayVideo={(url) => setActiveVideo(url)}
                />
              ))}
            </div>

            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 rounded-2xl text-sm font-semibold transition-colors"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </PageWrapper>

      {activeVideo && (
        <VideoModal url={activeVideo} onClose={() => setActiveVideo(null)} />
      )}
    </>
  )
}
