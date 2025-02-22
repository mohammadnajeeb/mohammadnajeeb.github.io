// src/assets/js/api.js

const InstagramAPI = {
    accessToken: 'YOUR_INSTAGRAM_ACCESS_TOKEN',
    userId: 'YOUR_INSTAGRAM_USER_ID',

    fetchPosts: async function() {
        const response = await fetch(`https://graph.instagram.com/${this.userId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink&access_token=${this.accessToken}`);
        const data = await response.json();
        return data.data;
    },

    displayPosts: function(posts) {
        const container = document.getElementById('instagram-posts');
        posts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.className = 'instagram-post';
            postElement.innerHTML = `
                <a href="${post.permalink}" target="_blank">
                    <img src="${post.media_type === 'IMAGE' ? post.media_url : post.thumbnail_url}" alt="${post.caption || ''}">
                </a>
            `;
            container.appendChild(postElement);
        });
    }
};

const YouTubeAPI = {
    apiKey: 'YOUR_YOUTUBE_API_KEY',

    fetchVideos: async function(channelId) {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?key=${this.apiKey}&channelId=${channelId}&part=snippet,id&order=date&maxResults=5`);
        const data = await response.json();
        return data.items;
    },

    displayVideos: function(videos) {
        const container = document.getElementById('youtube-videos');
        videos.forEach(video => {
            const videoElement = document.createElement('div');
            videoElement.className = 'youtube-video';
            videoElement.innerHTML = `
                <a href="https://www.youtube.com/watch?v=${video.id.videoId}" target="_blank">
                    <img src="${video.snippet.thumbnails.default.url}" alt="${video.snippet.title}">
                    <h3>${video.snippet.title}</h3>
                </a>
            `;
            container.appendChild(videoElement);
        });
    }
};