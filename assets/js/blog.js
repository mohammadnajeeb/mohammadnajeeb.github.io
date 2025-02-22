// src/assets/js/blog.js

// Function to fetch and display blog posts from the Markdown files
async function loadBlogPosts() {
    const postsContainer = document.getElementById('posts-container');
    const posts = await fetchPosts();

    posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.classList.add('post');

        const titleElement = document.createElement('h2');
        titleElement.textContent = post.title;

        const contentElement = document.createElement('div');
        contentElement.innerHTML = post.content;

        postElement.appendChild(titleElement);
        postElement.appendChild(contentElement);
        postsContainer.appendChild(postElement);
    });
}

// Function to fetch posts from the blog/posts directory
async function fetchPosts() {
    const response = await fetch('/blog/posts/posts.json');
    const posts = await response.json();
    return posts;
}

// Call the loadBlogPosts function when the page loads
document.addEventListener('DOMContentLoaded', loadBlogPosts);