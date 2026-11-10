<?php
require('inc/routes.php');
require_once './db.php';

?>
<!DOCTYPE html>
<html>
<head>
    
    <meta charset="utf-8">


    <title>MyOS</title>
    
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700&display=swap" rel="stylesheet">
    <link href="css/home.css" rel="stylesheet">
    <link rel="icon" type="image/x-icon" href="img/logo_start_menu_os.png">

    <script defer type="module" src="js/index.js" ></script>
</head>
<body>
    <?php include($pathTV); ?>
    <?php include($pathTVButtons); ?>
    <div id="swup" class="transition-fade" data-swup>
        
        <?php

            $vue = $vueStart;

            if(isset($_GET['page'])) {
                $nomPage = $_GET['page'];
                if(isset($routes[$nomPage])) {
 
                    $vue = $routes[$nomPage]['vue'];
                }
            }

			if($vue != $routes['accueil']['vue'] && $vue != $routes['endoflight']['vue'] && $vue != $vueStart){
                include($pathHeader); 
            }

        ?>

        <div id="divCentral">
            <main>
                <?php
                include('vues/' . $vue . '.php');
                ?>
            </main>
        </div>

        
    </div>
    <video id="transition-video" class="transition-video" width="600" muted>
        <source src="img/transition_video.mp4" type="video/mp4" >
        Your browser does not support the video tag.
    </video>
 

</body>
</html>