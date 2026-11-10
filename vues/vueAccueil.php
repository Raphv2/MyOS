<div class="screen">

    <div class="full_screen" id="full_screen_slider">
        <div id="exit_menu" class="dropdown-content">
            <div class="exit_fullscreen_container">
                <div id="exit_fullscreen"></div>
                <div id="exit_fullscreen_name">Exit FullScreen</div>
            </div>
        </div>
    </div>

    <div id="eye_widget" class="widget">
        <div class="top_widget">
            <div class="close-btn" onclick="document.getElementById('eye_widget').remove();"></div>
            <div class="application_name">eye_widget</div>
        </div>
        <div id="eye_border_inner_contener" class="border-inner-contener" style="background-color: #EFEFEF;">
            <div class="content" id="content_eye_widget" style="height: 100%; width: 100%;">
                <img src="img/eye_gif.gif" alt="Eye GIF" style="height: 100%; width: 100%; object-fit: fill; z-index: 2;">
                <div style="
                    position: absolute;
                    top: 55%;
                    left: 45%;
                    transform: translate(-50%, -50%);
                    height: 20%;
                    width: 20%;
                ">
                    <img src="img/eye.png" id="eye" style="height: 100%; width: 100%; object-fit: fill;">
                </div>
            </div>
        </div>
    </div>
    
    <div id="profile_widget" class="widget">
        <div class="top_widget">
            <div class="close-btn" onclick="document.getElementById('profile_widget').remove();"></div>
            <div class="application_name">profile_widget</div>
        </div>
        <div id="profile_border_inner_contener" class="border-inner-contener" style="background-color: #EFEFEF;">
            <div class="content" id="content_profile_widget" style="height: 100%; width: 100%;">
                <div class="profile_image_dropdown"></div>
                <p class="raph_name">Raphaël Gosset</p>
                <p class="profile_subtitle" style="text-align: left;">
                    Hey! I'm Raph, a fullstack developer.<br>
                    I built this portfolio to share a bit of my world and offer you a different kind of web experience.<br>
                    I’ll be happy to help you bring your projects to life, so feel free to get in touch! :)
                </p>
            </div>     
        </div>         
    </div>            


    <div id="contact_us" class="widget">
        <div class="top_widget">
            <div class="close-btn" onclick="document.getElementById('contact_us').remove();"></div>
            <div class="application_name">CONTACT_US</div>
        </div>
        <div id="contact_border_inner_contener" class="border-inner-contener" style="background-color: #EFEFEF;">
            <div class="content" id="content_contact_widget" style="height: 100%; width: 100%;">
                <img src="img/IMAGE_fond.png" alt="fond_piquant!" style="height: 100%; width: 100%; object-fit: fill; z-index: 2;">
                <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    height: 100%;
                    width: 100%;
                    z-index: 5;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                ">
                    <img src="img/spirale.png" class="spirale" id="Spirale.exe" style="height: 50%; width: 50%; object-fit: contain; animation: rotation 3s linear infinite;">
                    <!--<a href="mailto:raphael@example.com?subject=Projet%20Web&body=Bonjour%20Raphaël,%0A%0AJ’aimerais%20discuter%20d’un%20projet%20avec%20vous.">-->
                    <!--    <div class="profile_image_contener"></div>-->
                    <!--</a>-->
                    <p style="
                        font-size: 8px;
                        color: #7db086;
                        margin-top: 10px;
                        text-align: center;
                        animation: float 2.5s ease-in-out infinite;
                        display: inline-block;
                    ">
                        ↑ CLICK HERE ↑
                    </p>

                    <style>
                        @keyframes rotation {
                            from {
                                transform: rotate(0deg);
                            }
                            to {
                                transform: rotate(360deg);
                            }
                        }
                        @keyframes float {
                            0% {
                                transform: translateY(0);
                            }
                            50% {
                                transform: translateY(-2px);
                            }
                            100% {
                                transform: translateY(0);
                            }
                        }
                    </style>
                </div>
            </div>
        </div>
    </div>

    <div class="rectangular-bar">
        <div id="id_Home_icon" class="application"></div>

        <!-- Divs avec une bordure à droite -->
        <div class="additional-container" style="
            border-right: 2px solid rgb(239, 239, 239);
            height: 80%;
            margin-left: 0.5vw;
            display: flex;
            align-items: center;
            box-shadow:
                1px 1px 0px rgba(0, 0, 0, 1),
                -1px -1px 0px rgb(130, 130, 130);
        "></div>

        <div class="additional-container" style="
            border-right: 2px solid rgb(238, 238, 238);
            height: 80%;
            margin-left: 0.2vw;
            margin-right: 0.4vw;
            display: flex;
            align-items: center;
            box-shadow:
                1px 1px 0px rgba(0, 0, 0, 1),
                -1px -1px 0px rgb(124, 124, 124);
        "></div>
    </div>

    <div class="rectangular-bar-top">
        <img src="img/logo_start_menu_os.png" alt="Logo OS" class="logo-os" id="logo-os">

        <div class="additional-container2" style="
            border-right: 1px solid rgb(239, 239, 239);
            height: 80%;
            margin-left: 3vw;
            display: flex;
            align-items: center;
            box-shadow:
                1px 1px 0px rgba(0, 0, 0, 1),
                -1px -1px 0px rgb(130, 130, 130);
        "></div>

        <div class="name_container" id="name_container_button">
            <div class="name">Raphaël Gosset</div>
            <div class="arrow_slide"></div>

            <div class="dropdown_menu" id="raph_dropdown">
                <div class="profile_image_dropdown"></div>
                <p class="raph_name">Raphaël Gosset</p>
                <p class="profile_subtitle" style="text-align: left;">
                    Hey! I'm Raph, a fullstack developer.<br>
                    I built this portfolio to share a bit of my world and offer you a different kind of web experience.<br>
                    I’ll be happy to help you bring your projects to life, so feel free to get in touch! :)
                </p>
            </div>
        </div>

        <div class="name_container" id="name_container_button2">
            <div class="name">Start</div>
            <div class="arrow_slide"></div>

            <div id="start_menu" class="dropdown-content">
                <div class="recent_files"></div>
                <div id="shutdown">
                    <img src="img/shutdown.png">
                </div>
            </div>
        </div>

        <div class="datetime" id="datetime"></div>
    </div>

</div>
