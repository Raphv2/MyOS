
export function getRandomPosition(min, max, step) {
    let randomValue = Math.round((Math.random() * (max - min) + min) / step) * step;
    return randomValue;
}

export function positionMenuItems(minHeight, minWidth, maxHeight, maxWidth, stepHeight, stepWidth) {
    const menuItems = document.querySelectorAll('.menu_item');

    const usedPositions = [];

    // Récupération des deux widgets à éviter
    const widgets = ['eye_widget', 'contact_us', 'profile_widget']
        .map(id => document.getElementById(id))
        .filter(el => el !== null); // garder seulement ceux qui existent

    if (widgets.length === 0) {
        return;
    }

    // Calcul des zones à éviter pour chaque widget
    const forbiddenZones = widgets.map(widget => {
        const rect = widget.getBoundingClientRect();
        const bounds = {
            left: (rect.left / window.innerWidth) * 100,
            top: (rect.top / window.innerHeight) * 100,
            width: (rect.width / window.innerWidth) * 100,
            height: (rect.height / window.innerHeight) * 100
        };
        bounds.right = bounds.left + bounds.width;
        bounds.bottom = bounds.top + bounds.height;
        return bounds;
    });

    menuItems.forEach((item) => {
        let left, top;
        let tries = 0;

        do {
            left = getRandomPosition(minWidth, maxWidth, stepWidth);
            top = getRandomPosition(minHeight, maxHeight, stepHeight);

            tries++;
            if (tries > 100) {
                console.warn("Trop d'essais, sortie de la boucle pour éviter une boucle infinie");
                break;
            }
        } while (
            forbiddenZones.some(zone =>
                left > zone.left - 10 &&                     // marge gauche
                left < zone.right + 10 &&                    // marge droite
                top > zone.top - zone.height * 0.5 - 5 &&    // marge haut selon taille
                top < zone.bottom + zone.height * 0.5 + 5    // marge bas selon taille
            ) ||
            // **Évite les positions déjà utilisées**
            usedPositions.some(pos => pos.left === left && pos.top === top)
        );
        
        

        usedPositions.push({ left, top });

        item.style.left = `${left}vw`;
        item.style.top = `${top}vh`;
    });
}




export function enableDrag(minHeight, minWidth, maxHeight, maxWidth, stepHeight, stepWidth, offsetX, offsetY) {
    
    document.addEventListener('pointerdown', function (e) {
        let item = e.target.closest(`.menu_item`);

        if (!item) return;

        const rect = item.getBoundingClientRect();
        const shiftX = e.clientX - rect.left;
        const shiftY = e.clientY - rect.top;
        let isMoved = false;

        function moveAt(pageX, pageY) {
            const newLeft = pageX - shiftX;
            const newTop = pageY - shiftY;

            const newLeftVW = (newLeft / window.innerWidth) * 100;
            const newTopVH = (newTop / window.innerHeight) * 100;

            item.style.left = `${newLeftVW - offsetX}vw`;
            item.style.top = `${newTopVH - offsetY}vh`;

            isMoved = true;
        }

        function snapToGrid(value, gridSize) {
            return Math.round(value / gridSize) * gridSize;
        }

        function onPointerMove(event) {
            moveAt(event.pageX, event.pageY);
        }

        document.addEventListener('pointermove', onPointerMove);

        document.addEventListener(
            'pointerup',
            function () {
                document.removeEventListener('pointermove', onPointerMove);

                if (!isMoved) return;

                const currentLeftVW = parseFloat(item.style.left);
                const currentTopVH = parseFloat(item.style.top);

                const gridWidthVW = stepWidth;
                const gridHeightVH = stepHeight;

                const snappedLeftVW = snapToGrid(currentLeftVW, gridWidthVW);
                const snappedTopVH = snapToGrid(currentTopVH, gridHeightVH);

                if (snappedLeftVW <= minWidth) item.style.left = `${minWidth}vw`;
                else if (snappedLeftVW >= maxWidth) item.style.left = `${maxWidth}vw`;
                else item.style.left = `${snappedLeftVW}vw`;

                if (snappedTopVH <= minHeight) item.style.top = `${minHeight}vh`;
                else if (snappedTopVH >= maxHeight) item.style.top = `${maxHeight}vh`;
                else item.style.top = `${snappedTopVH}vh`;
            },
            { once: true }
        );

        item.ondragstart = () => false;
    });
}


export function initialize(minHeight, minWidth, maxHeight, maxWidth, stepHeight, stepWidth, offsetX, offsetY, isMobile) {
    
    positionMenuItems(minHeight, minWidth, maxHeight, maxWidth, stepHeight, stepWidth);
    if(!isMobile) enableDrag(minHeight, minWidth, maxHeight, maxWidth, stepHeight, stepWidth, offsetX, offsetY);
}