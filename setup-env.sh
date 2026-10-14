#!/bin/bash

echo "🔧 Duove Environment Setup"
echo "==========================="
echo ""

# Edge function secrets (supabase functions serve --env-file duove-backend/.env)
echo "📦 Setting up backend .env ..."
if [ -f duove-backend/.env ]; then
  echo "⚠️  duove-backend/.env already exists. Skipping."
else
  read -p "Supabase URL: " SUPABASE_URL
  read -p "Supabase Service Role Key: " SUPABASE_SERVICE_ROLE_KEY
  read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
  read -p "Spotify Client ID: " SPOTIFY_CLIENT_ID
  read -p "Spotify Client Secret: " SPOTIFY_CLIENT_SECRET

  cat > duove-backend/.env <<EOF
SUPABASE_URL=$SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SPOTIFY_CLIENT_ID=$SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET=$SPOTIFY_CLIENT_SECRET
EOF
  echo "✅ Backend .env created."
fi

echo ""

# Frontend .env.local
echo "🎨 Setting up frontend .env.local ..."
if [ -f frontend/.env.local ]; then
  echo "⚠️  frontend/.env.local already exists. Skipping."
else
  read -p "VITE_SUPABASE_URL (same as above): " VITE_SUPABASE_URL
  read -p "VITE_SUPABASE_ANON_KEY (same anon key): " VITE_SUPABASE_ANON_KEY
  read -p "VITE_BACKEND_URL ($VITE_SUPABASE_URL/functions/v1): " VITE_BACKEND_URL
  VITE_BACKEND_URL=${VITE_BACKEND_URL:-$VITE_SUPABASE_URL/functions/v1}

  cat > frontend/.env.local <<EOF
VITE_SUPABASE_URL=$VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
VITE_BACKEND_URL=$VITE_BACKEND_URL
EOF
  echo "✅ Frontend .env.local created."
fi

echo ""
echo "🎉 All done! You can now start the backend and frontend."
