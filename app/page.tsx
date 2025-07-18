'use client';

import { useState, useEffect, useMemo } from 'react';
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

// 定義済みゲームタグ
const GAME_TAGS = [
  '#VALORANT',
  '#Apex Legends',
  '#Fortnite',
  '#Call of Duty',
  '#CS2',
  '#Overwatch 2',
  '#Rainbow Six Siege',
  '#League of Legends',
  '#PUBG',
  '#Minecraft',
  '#Fall Guys',
  '#Rocket League',
  '#Dead by Daylight',
  '#Street Fighter 6',
  '#Tekken 8',
  '#その他'
];

type Post = {
  id?: string;
  url: string;
  tag: string;
  createdAt: Timestamp;
  uid: string | null;
  displayName: string | null;
  photoURL: string | null;
};

// クリップ埋め込みURLを取得する関数
const getEmbedUrl = (url: string, parentDomain: string): string | null => {
  console.log("getEmbedUrl が呼び出されました。受け取ったURL:", url);
  try {
    const u = new URL(url);
    console.log("URLオブジェクトのホスト名:", u.hostname);
    console.log("URLオブジェクトのパス名:", u.pathname);
    

    // YouTube
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      const regex = /(?:\?v=|\/embed\/|\.be\/)([a-zA-Z0-9_-]{11})/;
      const match = url.match(regex);
      if (match) {
        return `https://www.youtube.com/embed/${match[1]}`;
      }
    }
    // Twitch Clips & Live
    else if (u.hostname.includes('twitch.tv')) {
      console.log("Twitch URLと認識されました。");
      
      // Twitch クリップの処理を修正
      if (u.hostname === 'clips.twitch.tv') {
        // https://clips.twitch.tv/TameLivelyGoatKappaPride-H1Hxej69cFkx9EOd の形式
        const clipId = u.pathname.slice(1); // 先頭の '/' を除去
        console.log("clips.twitch.tv から抽出されたクリップID:", clipId);
        if (clipId) {
          const embedUrl = `https://clips.twitch.tv/embed?clip=${clipId}&parent=${parentDomain}`;
          console.log("生成された埋め込みURL:", embedUrl);
          return embedUrl;
        }
      } else if (u.hostname === 'www.twitch.tv') {
        // https://www.twitch.tv/username/clip/TameLivelyGoatKappaPride-H1Hxej69cFkx9EOd の形式
        const clipMatch = u.pathname.match(/\/[^\/]+\/clip\/([a-zA-Z0-9_-]+)/);
        console.log("www.twitch.tv クリップマッチ結果:", clipMatch);
        if (clipMatch && clipMatch[1]) {
          const embedUrl = `https://clips.twitch.tv/embed?clip=${clipMatch[1]}&parent=${parentDomain}`;
          console.log("生成された埋め込みURL:", embedUrl);
          return embedUrl;
        }
        // ライブ配信の場合
        else if (u.pathname.length > 1 && !u.pathname.includes('/clip/')) {
          const channelName = u.pathname.slice(1).split('/')[0]; // 最初のパス要素のみ取得
          return `https://player.twitch.tv/?channel=${channelName}&parent=${parentDomain}&muted=true`;
        }
      }
    }
    // Medal.tv Clips
    else if (u.hostname.includes('medal.tv')) {
      const medalClipIdMatch = u.pathname.match(/(?:clips\/|clip\/)([a-zA-Z0-9_-]+)(?:[\/?]|$)/);
      if (medalClipIdMatch && medalClipIdMatch[1]) {
          return `https://medal.tv/clip/${medalClipIdMatch[1]}/embed`;
      }
    }
  } catch (e) {
      console.error("URL解析エラー:", e);
      return null;
  }
  console.log("どの埋め込みパターンにもマッチしませんでした。");
  return null;
};

// EmbedVideoコンポーネント
const EmbedVideo = ({ url, parentDomain }: { url: string; parentDomain: string | null }) => {
  if (parentDomain === null) {
    return null;
  }

  const embedSrc = getEmbedUrl(url, parentDomain);

  if (!embedSrc) {
    return <p>このURLの埋め込みには対応していません。</p>;
  }

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

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [url, setUrl] = useState('');
  const [tag, setTag] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showMyPostsOnly, setShowMyPostsOnly] = useState(false);

  const parentDomain = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.location.hostname;
    }
    return null;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

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

  const deletePost = async (postId: string) => {
    await deleteDoc(doc(db, 'posts', postId));
    fetchPosts();
  };

  const filteredPosts = posts.filter((post) => {
    if (Date.now() - post.createdAt.toDate().getTime() > POST_LIFETIME_MS)
      return false;
    if (selectedTag && post.tag !== selectedTag) return false;
    if (showMyPostsOnly && post.uid !== user?.uid) return false;
    return true;
  });

  const uniqueTags = [...new Set(posts.map((post) => post.tag))];

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };
  const handleLogout = async () => {
    await signOut(auth);
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
              placeholder="クリップURL (YouTube/Twitch/Medal.tv対応)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="p-2 border rounded"
            />
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="p-2 border rounded bg-white"
            >
              <option value="">ゲームタグを選択してください</option>
              {GAME_TAGS.map((gameTag) => (
                <option key={gameTag} value={gameTag}>
                  {gameTag}
                </option>
              ))}
            </select>
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
              <div key={post.id} className="border rounded p-4 shadow">
                <div className="mb-2 flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <img
                      src={post.photoURL || ''}
                      alt="avatar"
                      className="w-5 h-5 rounded-full"
                    />
                    <span>{post.displayName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{post.tag}</span>
                    {user?.uid === post.uid && (
                      <button
                        className="text-red-600 text-sm underline"
                        onClick={() => {
                          if (post.id) deletePost(post.id);
                        }}
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>

                <div className="aspect-video mb-2">
                  <EmbedVideo url={post.url} parentDomain={parentDomain} />
                </div>
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