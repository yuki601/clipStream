'use client';

import { useState, useEffect } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  collection,
  addDoc,
  Timestamp,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
  DocumentData,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase'; // Assuming '@/lib/firebase' points to your firebase.ts file

const POST_LIFETIME_MS = 1000 * 60 * 60 * 24; // 24時間

type Post = {
  id?: string;
  url: string;
  tag: string;
  createdAt: Timestamp;
  uid: string | null;
  displayName: string | null;
  photoURL: string | null;
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [url, setUrl] = useState('');
  const [tag, setTag] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showMyPostsOnly, setShowMyPostsOnly] = useState(false);

  // ログイン状態監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  // 投稿をFirestoreから取得
  const fetchPosts = async () => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => {
      const d = doc.data() as DocumentData;
      return {
        id: doc.id,
        url: d.url,
        tag: d.tag,
        createdAt: d.createdAt,
        uid: d.uid,
        displayName: d.displayName,
        photoURL: d.photoURL,
      };
    });
    setPosts(data);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // 投稿登録
  const handlePost = async () => {
    if (!url || !tag || !user) return;

    const newPost = {
      url,
      tag,
      createdAt: Timestamp.now(),
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };

    await addDoc(collection(db, 'posts'), newPost);

    setUrl('');
    setTag('');
    fetchPosts();
  };

  // 投稿削除
  const deletePost = async (postId: string) => {
    await deleteDoc(doc(db, 'posts', postId));
    fetchPosts();
  };

  // 24時間以内の投稿だけ表示＆タグ絞り込み＆自分の投稿のみ表示
  const filteredPosts = posts.filter((post) => {
    if (Date.now() - post.createdAt.toDate().getTime() > POST_LIFETIME_MS)
      return false;
    if (selectedTag && post.tag !== selectedTag) return false;
    if (showMyPostsOnly && post.uid !== user?.uid) return false;
    return true;
  });

  const uniqueTags = [...new Set(posts.map((post) => post.tag))];

  // ログイン・ログアウト処理
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };
  const handleLogout = async () => {
    await signOut(auth);
  };

  // クリップ埋め込みURLを取得する関数（YouTube/Twitch対応済み）
  const getEmbedUrl = (url: string, parentDomain: string): string | null => {
    try {
      const u = new URL(url);

      // YouTube
      // YouTubeのホスト名（www.youtube.com または youtu.be）をチェック
      if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
        const regex = /(?:\?v=|\/embed\/|\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = url.match(regex);
        if (match) {
          // 正しいYouTube埋め込みURLを返す
          return `https://www.youtube.com/embed/${match[1]}`;
        }
      }
      // Twitch Clips
      else if (
        u.hostname === 'clips.twitch.tv' ||
        u.hostname.endsWith('.twitch.tv')
      ) {
        const clipId = u.pathname.slice(1); // 例: /ClipID から ClipID を抽出
        if (clipId)
          return `https://clips.twitch.tv/embed?clip=${clipId}&parent=${parentDomain}`;
      }
      // 他のサービスは後で追加可能
    } catch {
      return null;
    }
    return null;
  };

  // 埋め込み動画コンポーネント
  const EmbedVideo = ({ url }: { url: string }) => {
    const [parentDomain, setParentDomain] = useState('');
    useEffect(() => {
      if (typeof window !== 'undefined') {
        setParentDomain(window.location.hostname);
      }
    }, []);

    const embedSrc = getEmbedUrl(url, parentDomain);

    if (!embedSrc) return <p>このURLの埋め込みには対応していません。</p>;

    return (
      <iframe
        className="w-full h-full"
        src={embedSrc}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Clip"
      />
    );
  };

  return (
    <main className="p-8 max-w-xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">🎮 ClipStream</h1>
        {user ? (
          <div className="flex gap-2 items-center">
            <img
              src={user.photoURL || ''}
              alt="avatar"
              className="w-8 h-8 rounded-full"
            />
            <span className="text-sm">{user.displayName}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-500 underline"
            >
              ログアウト
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="bg-blue-600 text-white px-3 py-1 rounded"
          >
            Googleでログイン
          </button>
        )}
      </div>

      {user ? (
        <>
          <div className="flex flex-col gap-4 mb-4">
            <input
              type="text"
              placeholder="クリップURL (YouTube/Twitch対応)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="p-2 border rounded"
            />
            <input
              type="text"
              placeholder="ゲームタグ（例: #VALORANT）"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="p-2 border rounded"
            />
            <button
              onClick={handlePost}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              投稿する
            </button>
          </div>

          <h2 className="text-xl font-semibold mb-2">🔖 タグで絞り込み</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-3 py-1 rounded border ${
                selectedTag === null ? 'bg-gray-800 text-white' : 'bg-white'
              }`}
            >
              全て
            </button>
            {uniqueTags.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTag(t)}
                className={`px-3 py-1 rounded border ${
                  selectedTag === t ? 'bg-blue-600 text-white' : 'bg-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <button
              onClick={() => setShowMyPostsOnly(false)}
              className={`px-3 py-1 mr-2 rounded border ${
                !showMyPostsOnly ? 'bg-gray-800 text-white' : 'bg-white'
              }`}
            >
              全ての投稿
            </button>
            <button
              onClick={() => setShowMyPostsOnly(true)}
              className={`px-3 py-1 rounded border ${
                showMyPostsOnly ? 'bg-blue-600 text-white' : 'bg-white'
              }`}
            >
              自分の投稿
            </button>
          </div>

          <h2 className="text-xl font-semibold mb-2">📺 投稿一覧</h2>
          <div className="flex flex-col gap-6">
            {filteredPosts.map((post) => (
              <div key={post.id} className="border rounded p-4 shadow relative">
                <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
                  <img
                    src={post.photoURL || ''}
                    alt="avatar"
                    className="w-5 h-5 rounded-full"
                  />
                  <span>{post.displayName}</span>
                  <span className="ml-auto">{post.tag}</span>
                </div>

                <div className="aspect-video mb-2">
                  <EmbedVideo url={post.url} />
                </div>

                {user?.uid === post.uid && (
                  <button
                    className="absolute top-2 right-2 text-red-600 text-sm underline"
                    onClick={() => {
                      if (post.id) deletePost(post.id);
                    }}
                  >
                    削除
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-gray-600">ログインすると投稿できます。</p>
      )}
    </main>
  );
}