<div class="buttons">
    <img class="power_button" src="img\power_button.png" alt="power_button" id="power_button">
    <img class="logo_myos" src="img\logo_myos.png" alt="logo_myos" >
    <img class="source_button" src="img\source_button.png" alt="source_button" >
    <img class="fullscreen_postIt" src="img\fullscreen.png" alt="fullscreen_postIt" >
</div>

<script>
    document.getElementById('power_button').addEventListener('click', function() {
            // Vérifie l'URL actuelle
            if (window.location.href.includes('index.php?page=endoflight')) {
                // Redirige vers index.php si déjà sur page2.php
                window.location.href = 'index.php';
            } else {
                // Redirige vers page2.php sinon
                window.location.href = 'index.php?page=endoflight';
            }
        });
</script>