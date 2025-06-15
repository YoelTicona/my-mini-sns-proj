// Seleccionar todos los posts
document.querySelectorAll(".post").forEach((post) => {
  const commentList = post.querySelector(".comments");
  const input = post.querySelector(".comment-input");
  const addButton = post.querySelector(".add-comment");
  const commentCount = post.querySelector(".comment-count");

  // Función para actualizar el contador de comentarios
  function updateCommentCount() {
    const count = commentList.querySelectorAll("p").length;
    commentCount.innerText = `Comments (${count})`;
  }

  // Evento para agregar un comentario
  addButton.addEventListener("click", () => {
    const commentText = input.value.trim();
    if (commentText) {
      const comment = document.createElement("p");
      comment.innerText = commentText;

      const deleteBtn = document.createElement("button");
      deleteBtn.innerText = "Delete";
      deleteBtn.style.marginLeft = "10px";
      deleteBtn.addEventListener("click", () => {
        comment.remove();
        updateCommentCount(); // Actualizar contador al borrar
      });

      comment.appendChild(deleteBtn);
      commentList.appendChild(comment);
      updateCommentCount();
      input.value = "";
    }
  });

  // Evento para el botón like
  const likeButton = post.querySelector(".like-button");
  const likesCountSpan = post.querySelector(".likes-count");

  likeButton.addEventListener("click", async () => {
    const postUuid = likeButton.dataset.id;
    const isLiked = likeButton.dataset.liked === "true";

    try {
      const response = await fetch(`/posts/${postUuid}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();

        likeButton.dataset.liked = (!isLiked).toString();
        likeButton.textContent = !isLiked ? "💌" : "🤍";

        if (likesCountSpan) {
          likesCountSpan.textContent = `${data.likesCount} likes`;
        }
      } else {
        console.error("Failed to toggle like");
      }
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  });
});
