function loadGallery() {
    const gallery = document.getElementById('gallery');
    
    // List of supported image extensions
    const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    // Function to create image card
    function createImageCard(imagePath) {
        return `
            <div class="col-md-4 col-sm-6 mb-4">
                <div class="card h-100 gallery-item">
                    <img src="${imagePath}" class="card-img-top" alt="Gallery Image"
                         data-mdb-toggle="modal" data-mdb-target="#imageModal"
                         onclick="showImage('${imagePath}')">
                    <div class="card-body">
                        <p class="card-text text-muted">
                            ${imagePath.split('/').pop().split('.')[0].replace(/-/g, ' ')}
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    // Load images from the images directory
    fetch('/social/images/')
        .then(response => response.text())
        .then(data => {
            const parser = new DOMParser();
            const html = parser.parseFromString(data, 'text/html');
            const files = Array.from(html.querySelectorAll('a'))
                .map(a => a.href)
                .filter(href => extensions.some(ext => href.toLowerCase().endsWith(ext)));
            
            gallery.innerHTML = files.map(file => createImageCard(file)).join('');
        })
        .catch(error => console.error('Error loading gallery:', error));
}

// Image modal functionality
function showImage(imagePath) {
    const modalImg = document.getElementById('modalImage');
    modalImg.src = imagePath;
}

document.addEventListener('DOMContentLoaded', loadGallery);