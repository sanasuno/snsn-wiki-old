/**
 * @scripts/lightbox.ts
 */

export function lightbox() {
    var images = document.querySelectorAll('.main-content img');
    if (!images.length) return;

    var overlay = document.createElement('div');
    overlay.id = 'lightbox-overlay';
    overlay.innerHTML = 
        '<div class="lightbox-inner">' + 
        '<button class="lightbox-close" aria-label="close"><i class="fa-solid fa-xmark"></i></button>' + 
        '<img class="lightbox-img" src="" alt="" />' + 
        '<p class="lightbox-caption"></p>' + 
        '</div>';
    document.body.appendChild(overlay);

    var lbImg = overlay.querySelector('.lightbox-img') as HTMLImageElement;
    var lbCaption = overlay.querySelector('.lightbox-caption') as HTMLParagraphElement;
    var lbClose = overlay.querySelector('.lightbox-close') as HTMLButtonElement;

    function open(img: HTMLImageElement) {
        lbImg.src = img.src;
        lbImg.alt = img.alt;
        lbCaption.textContent = img.alt || '';
        lbCaption.style.display = img.alt ? 'block' : 'none';
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function close() {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    images.forEach(function (img) {
        (img as HTMLImageElement).style.cursor = 'zoom-in';
        img.addEventListener('click', function () {
            open(img as HTMLImageElement);
        });
    });

    lbClose.addEventListener('click', close);
    overlay.addEventListener('click', function (e: MouseEvent) {
        if (e.target === overlay || e.target === overlay.querySelector('.lightbox-inner')) {
            close();
        }
    });

    document.addEventListener('keydown', function (e: KeyboardEvent) {
        if (e.key === 'Escape') {
            close();
        }
    });
}
