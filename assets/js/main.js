// src/assets/js/main.js

document.addEventListener("DOMContentLoaded", function() {
    // Smooth scrolling for navigation links
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener("click", function(e) {
            e.preventDefault();
            const targetId = this.getAttribute("href");
            const targetElement = document.querySelector(targetId);
            targetElement.scrollIntoView({ behavior: "smooth" });
        });
    });

    // Display the quote
    const quoteElement = document.getElementById("quote");
    if (quoteElement) {
        quoteElement.textContent = "Solving the world's problems one line of code at a time 🌍";
    }
});