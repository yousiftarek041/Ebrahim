/* ==========================================
   Wedding Invitation — Ebrahim & Shahd
   script.js — البتلات، فتح الدعوة، ظهور الأقسام،
   العد التنازلي، التقويم، إضافة للتقويم،
   سجل التهاني (Supabase)، والموسيقى.
   ========================================== */

document.addEventListener('DOMContentLoaded', function () {

    /* ---------------------------------------------
       0) إعدادات عامة
    --------------------------------------------- */

    // تاريخ ووقت حفل الزفاف: 14 أغسطس 2026 الساعة 8:00 مساءً
    var WEDDING_DATE = new Date(2026, 7, 14, 20, 0, 0);

    var PETAL_IMG = 'assets/images/hoa.webp';

    var reduceMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // اكتشاف موثوق لأجهزة iOS (آيفون/آيباد)، بما فيها iPadOS 13+
    // التي تخفي نفسها كـ Mac في الـ userAgent لكنها تدعم اللمس
    function isIOSDevice() {
        var ua = navigator.userAgent || navigator.vendor || '';
        var isAppleTouch = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
        var isIPadOS13Plus = navigator.platform === 'MacIntel' &&
            navigator.maxTouchPoints && navigator.maxTouchPoints > 1;
        return isAppleTouch || !!isIPadOS13Plus;
    }

    var IS_IOS = isIOSDevice();

    /* ---------------------------------------------
       1) البتلات المتساقطة (صورة ورد حقيقية)
    --------------------------------------------- */

    function initPetals() {

        var container = document.getElementById('petals');
        if (!container || reduceMotion) return;

        // على iOS نقلل عدد وسرعة إنشاء البتلات لتفادي إثقال Safari
        var initialCount = IS_IOS ? 3 : 5;
        var spawnIntervalMs = IS_IOS ? 3200 : 1800;

        function spawnPetal() {

            var petal = document.createElement('span');
            petal.className = 'petal';

            var img = document.createElement('img');
            img.src = PETAL_IMG;
            img.alt = '';
            petal.appendChild(img);

            var left = Math.random() * 100;
            var duration = 9 + Math.random() * 6; // 9s - 15s
            var delay = Math.random() * 2;
            var size = 26 + Math.random() * 22;

            petal.style.left = left + 'vw';
            petal.style.width = size + 'px';
            petal.style.animationDuration = duration + 's';
            petal.style.animationDelay = delay + 's';

            container.appendChild(petal);

            window.setTimeout(function () {
                petal.remove();
            }, (duration + delay) * 1000 + 200);
        }

        // بتلات أولية
        for (var i = 0; i < initialCount; i++) {
            window.setTimeout(spawnPetal, i * 600);
        }

        // بتلات مستمرة كل فترة (كل بتلة تُزال من الـ DOM تلقائياً
        // بعد انتهاء الأنيميشن الخاصة بها، فلا يحدث تراكم عناصر)
        window.setInterval(spawnPetal, spawnIntervalMs);
    }

    /* ---------------------------------------------
       2) التمرير التلقائي البطيء بعد فتح الدعوة
       (Auto-scroll: constant speed, cancellable by
       any user interaction, safe against duplicates,
       works on desktop / Android Chrome / iOS Safari)
    --------------------------------------------- */

    let autoScrollActive = false;
    let autoScrollRAF = null;

    // سرعة التمرير بالبكسل لكل إطار (ثابتة، بدون تسارع أو تباطؤ)
    var AUTO_SCROLL_SPEED = 1.2;

    // الأحداث التي تعتبر "تدخل يدوي من المستخدم" فتوقف التمرير التلقائي فوراً
    var USER_INTERRUPT_EVENTS = [
        'wheel',
        'touchstart',
        'pointerdown',
        'mousedown',
        'keydown'
    ];

    function handleUserInterrupt() {
        stopAutoScroll();
    }

    function startAutoScroll() {

        // امنع إنشاء أكثر من loop في نفس الوقت
        if (autoScrollActive) return;
        autoScrollActive = true;

        // أوقف التمرير التلقائي فور أي تفاعل يدوي من المستخدم
        USER_INTERRUPT_EVENTS.forEach(function (evt) {
            window.addEventListener(evt, handleUserInterrupt, { passive: true });
        });

        // scrollingElement هو العنصر الصحيح دائماً (html عادة) الذي
        // يمثل مساحة التمرير الفعلية للصفحة على كل المتصفحات بما فيها
        // Safari على iOS، بعكس الاعتماد على window.scrollBy وحدها
        var scroller = document.scrollingElement || document.documentElement;

        function step() {

            if (!autoScrollActive) return;

            var maxScroll = scroller.scrollHeight - window.innerHeight;
            var current = scroller.scrollTop;

            if (current >= maxScroll - 1) {
                stopAutoScroll();
                return;
            }

            scroller.scrollTop = current + AUTO_SCROLL_SPEED;

            // loop واحد فقط: كل إطار يستدعي نفسه مرة واحدة
            autoScrollRAF = window.requestAnimationFrame(step);
        }

        autoScrollRAF = window.requestAnimationFrame(step);
    }

    function stopAutoScroll() {

        if (!autoScrollActive) return;
        autoScrollActive = false;

        if (autoScrollRAF !== null) {
            window.cancelAnimationFrame(autoScrollRAF);
            autoScrollRAF = null;
        }

        USER_INTERRUPT_EVENTS.forEach(function (evt) {
            window.removeEventListener(evt, handleUserInterrupt);
        });
    }

    /* ---------------------------------------------
       3) شاشة الغلاف — فتح الدعوة
    --------------------------------------------- */

    function initCover() {

        var cover = document.getElementById('cover');
        var openBtn = document.getElementById('openBtn');
        var invite = document.getElementById('invite');
        var music = document.getElementById('music');
        var musicBtn = document.getElementById('musicBtn');

        if (!openBtn || !cover || !invite) return;

        openBtn.addEventListener('click', function () {

            // كونفيتي — نعطّلها على iPhone/iPad فقط لأن canvas-confetti
            // يثقل Safari وقت فتح الدعوة ويساهم في الـ lag/الشاشة البيضاء.
            // تبقى تعمل بشكل طبيعي على Desktop وAndroid.
            if (window.confetti && !reduceMotion && !IS_IOS) {
                window.confetti({
                    particleCount: 120,
                    spread: 90,
                    startVelocity: 45,
                    origin: { y: 0.6 },
                    colors: ['#a9832c', '#e6d9b8', '#7c8a5c', '#9aa878', '#ffffff']
                });
            }

            cover.classList.add('fade-out');

            // تشغيل الموسيقى من نفس الـ click event مباشرة (بدون أي انتظار
            // قبله) حتى يقبلها Safari ضمن سياسة الـ autoplay الخاصة به.
            // play() غير معطِّلة (non-blocking) لباقي الكود، وأي رفض من
            // Safari يُلتقط في catch بدون التأثير على بقية التنفيذ.
            if (music) {
                music.volume = 0.5;
                music.play().then(() => {
                    musicBtn?.classList.add('playing');
                }).catch(() => {
                    // Safari رفض التشغيل التلقائي، لا مشكلة، الزر اليدوي يبقى متاحاً
                });
            }

            setTimeout(() => {

                cover.style.display = "none";
                invite.classList.add("show");

                document.body.style.overflow = "";
                document.documentElement.style.overflow = "";

                // انتظر إطارين (رسم كامل) حتى ينتهي Safari من إعادة
                // حساب الـ layout والارتفاع بعد تغيير display/class،
                // فيتجنب الشاشة البيضاء والـ lag على iPhone
                requestAnimationFrame(() => {

                    requestAnimationFrame(() => {

                        revealVisibleSections();

                        // يبدأ النزول التلقائي بعد فتح الدعوة
                        setTimeout(() => {

                            if (!reduceMotion) {
                                startAutoScroll();
                            }

                        }, 1000);

                    });

                });

            }, 850);
        });

        document.body.style.overflow = "hidden";
    }

    /* ---------------------------------------------
       4) ظهور الأقسام تدريجياً عند التمرير
    --------------------------------------------- */

    var revealTargets = [];

    function revealVisibleSections() {
        revealTargets.forEach(function (el) {
            var rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.9) {
                el.classList.add('in-view');
            }
        });
    }

    function initReveal() {

        revealTargets = Array.prototype.slice.call(
            document.querySelectorAll('.section, .thanks')
        );

        if (!revealTargets.length) return;

        if ('IntersectionObserver' in window) {

            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('in-view');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.15 });

            revealTargets.forEach(function (el) {
                observer.observe(el);
            });

        } else {
            window.addEventListener('scroll', revealVisibleSections);
            revealVisibleSections();
        }
    }

    /* ---------------------------------------------
       5) العد التنازلي
    --------------------------------------------- */

    function initCountdown() {

        var elDays = document.getElementById('cd-days');
        var elHours = document.getElementById('cd-hours');
        var elMins = document.getElementById('cd-mins');
        var elSecs = document.getElementById('cd-secs');

        if (!elDays || !elHours || !elMins || !elSecs) return;

        function pad(n) {
            return String(n).padStart(2, '0');
        }

        function tick() {

            var now = new Date();
            var diff = WEDDING_DATE.getTime() - now.getTime();

            if (diff <= 0) {
                elDays.textContent = '00';
                elHours.textContent = '00';
                elMins.textContent = '00';
                elSecs.textContent = '00';
                window.clearInterval(timer);
                return;
            }

            var days = Math.floor(diff / (1000 * 60 * 60 * 24));
            var hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            var mins = Math.floor((diff / (1000 * 60)) % 60);
            var secs = Math.floor((diff / 1000) % 60);

            elDays.textContent = pad(days);
            elHours.textContent = pad(hours);
            elMins.textContent = pad(mins);
            elSecs.textContent = pad(secs);
        }

        tick();
        var timer = window.setInterval(tick, 1000);
    }

    /* ---------------------------------------------
       6) تقويم أغسطس 2026 مع تظليل يوم الفرح
    --------------------------------------------- */

    function initCalendar() {

        var titleEl = document.getElementById('calendarTitle');
        var gridEl = document.getElementById('calendarGrid');

        if (!titleEl || !gridEl) return;

        var year = WEDDING_DATE.getFullYear();
        var month = WEDDING_DATE.getMonth();
        var weddingDay = WEDDING_DATE.getDate();

        var monthNames = [
            'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];

        titleEl.textContent = monthNames[month] + ' ' + year;

        var dowLabels = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

        var firstDay = new Date(year, month, 1);
        var startOffset = firstDay.getDay();
        var daysInMonth = new Date(year, month + 1, 0).getDate();

        var html = '';

        dowLabels.forEach(function (label) {
            html += '<div class="dow">' + label + '</div>';
        });

        for (var i = 0; i < startOffset; i++) {
            html += '<div class="day empty"></div>';
        }

        for (var d = 1; d <= daysInMonth; d++) {
            var highlight = (d === weddingDay) ? ' highlight' : '';
            html += '<div class="day' + highlight + '">' + d + '</div>';
        }

        gridEl.innerHTML = html;
    }

    /* ---------------------------------------------
       7) زر "أضِف إلى التقويم"
    --------------------------------------------- */

    function toGCalDate(date) {
        var iso = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        return iso;
    }

    function initAddToCalendar() {

        var btn = document.getElementById('addCalendarBtn');
        if (!btn) return;

        var start = WEDDING_DATE;
        var end = new Date(WEDDING_DATE.getTime() + 3 * 60 * 60 * 1000);

        var title = encodeURIComponent('حفل زفاف Ebrahim & Shahd');
        var details = encodeURIComponent('يسعدنا حضوركم حفل زفاف Ebrahim & Shahd في قاعة سونيستا (Sonesta Hall)، بنها.');
        var location = encodeURIComponent('قاعة سونيستا (Sonesta Hall) - بنها، الفلل، بعد كوبري الفحص');

        var gcalUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
            + '&text=' + title
            + '&dates=' + toGCalDate(start) + '/' + toGCalDate(end)
            + '&details=' + details
            + '&location=' + location;

        btn.setAttribute('href', gcalUrl);
        btn.setAttribute('target', '_blank');
        btn.setAttribute('rel', 'noopener');

        btn.addEventListener('click', function () {
            showToast('جاري فتح تقويم جوجل 📅');
        });
    }

    /* ---------------------------------------------
       8) سجل التهاني — متصل بـ Supabase (مشترك لكل الزوار)
       fallback على localStorage لو الاتصال فشل
    --------------------------------------------- */

    var LOCAL_WISHES_KEY = 'wedding_wishes_ebrahim_shahd';
    var supabaseClient = null;

    function getSupabaseClient() {

        if (supabaseClient) return supabaseClient;

        if (typeof window.supabase === 'undefined' ||
            !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
            return null;
        }

        try {
            supabaseClient = window.supabase.createClient(
                window.SUPABASE_URL,
                window.SUPABASE_ANON_KEY
            );
            return supabaseClient;
        } catch (e) {
            return null;
        }
    }

    // ---- Fallback محلي (لو مفيش اتصال بالإنترنت أو Supabase مش شغال) ----

    function getLocalWishes() {
        try {
            var raw = window.localStorage.getItem(LOCAL_WISHES_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveLocalWish(wish) {
        try {
            var list = getLocalWishes();
            list.push(wish);
            window.localStorage.setItem(LOCAL_WISHES_KEY, JSON.stringify(list));
        } catch (e) {
            // تجاهل
        }
    }

    // ---- عرض التهاني في الصفحة ----

    function renderWishesList(wishes) {

        var listEl = document.getElementById('wishesList');
        var noWishesEl = document.getElementById('noWishes');
        if (!listEl) return;

        Array.prototype.slice.call(listEl.querySelectorAll('.wish-card')).forEach(function (card) {
            card.remove();
        });

        if (!wishes.length) {
            if (noWishesEl) {
                noWishesEl.textContent = 'No wishes yet. Be the first!';
                noWishesEl.style.display = '';
            }
            return;
        }

        if (noWishesEl) noWishesEl.style.display = 'none';

        wishes.forEach(function (wish) {

            var card = document.createElement('div');
            card.className = 'wish-card';

            var nameEl = document.createElement('p');
            nameEl.className = 'wish-name';
            nameEl.textContent = wish.name;

            var msgEl = document.createElement('p');
            msgEl.className = 'wish-message';
            msgEl.textContent = wish.message;

            card.appendChild(nameEl);
            card.appendChild(msgEl);
            listEl.appendChild(card);
        });
    }

    // ---- تحميل التهاني (من Supabase أو من التخزين المحلي) ----

    function loadWishes() {

        var client = getSupabaseClient();

        if (!client) {
            renderWishesList(getLocalWishes().slice().reverse());
            return;
        }

        client
            .from('wishes')
            .select('name, message, created_at')
            .order('created_at', { ascending: false })
            .then(function (res) {

                if (res.error) {
                    // فشل الاتصال بقاعدة البيانات، ارجع للنسخة المحلية
                    renderWishesList(getLocalWishes().slice().reverse());
                    return;
                }

                renderWishesList(res.data || []);
            })
            .catch(function () {
                renderWishesList(getLocalWishes().slice().reverse());
            });
    }

    // ---- إرسال تهنئة جديدة ----

    function submitWish(name, message) {

        var client = getSupabaseClient();

        if (!client) {
            saveLocalWish({ name: name, message: message });
            loadWishes();
            showToast('تم إرسال تهنئتك، شكراً لك 💗');
            return;
        }

        client
            .from('wishes')
            .insert([{ name: name, message: message }])
            .then(function (res) {

                if (res.error) {
                    // فشل الإرسال لأونلاين، احفظها محلياً كحل بديل
                    saveLocalWish({ name: name, message: message });
                    showToast('تعذّر الإرسال أونلاين، اتحفظت التهنئة عندك فقط');
                } else {
                    showToast('تم إرسال تهنئتك، شكراً لك 💗');
                }

                loadWishes();
            })
            .catch(function () {
                saveLocalWish({ name: name, message: message });
                loadWishes();
                showToast('تعذّر الإرسال أونلاين، اتحفظت التهنئة عندك فقط');
            });
    }

    // ---- تحديث لحظي (Realtime) لو مفعّل من لوحة تحكم Supabase ----

    function initRealtimeWishes() {

        var client = getSupabaseClient();
        if (!client || typeof client.channel !== 'function') return;

        try {
            client
                .channel('wishes-changes')
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'wishes' },
                    function () {
                        loadWishes();
                    }
                )
                .subscribe();
        } catch (e) {
            // Realtime مش مفعّل، مفيش مشكلة، الصفحة بتشتغل عادي بدونه
        }
    }

    function initGuestbook() {

        var wishBtn = document.getElementById('wishBtn');
        var wishForm = document.getElementById('wishForm');
        var wishCancel = document.getElementById('wishCancel');
        var nameInput = document.getElementById('wishName');
        var messageInput = document.getElementById('wishMessage');

        if (!wishBtn || !wishForm) return;

        wishBtn.addEventListener('click', function () {
            wishForm.hidden = !wishForm.hidden;
            if (!wishForm.hidden && nameInput) {
                nameInput.focus();
            }
        });

        if (wishCancel) {
            wishCancel.addEventListener('click', function () {
                wishForm.reset();
                wishForm.hidden = true;
            });
        }

        wishForm.addEventListener('submit', function (e) {

            e.preventDefault();

            var name = (nameInput && nameInput.value || '').trim();
            var message = (messageInput && messageInput.value || '').trim();

            if (!name || !message) return;

            submitWish(name, message);

            wishForm.reset();
            wishForm.hidden = true;
        });

        loadWishes();
        initRealtimeWishes();
    }

    /* ---------------------------------------------
       9) زر الموسيقى
    --------------------------------------------- */

    function initMusic() {

        var music = document.getElementById('music');
        var btn = document.getElementById('musicBtn');

        if (!music || !btn) return;

        btn.addEventListener('click', function () {

            if (music.paused) {
                music.play().then(function () {
                    btn.classList.add('playing');
                    btn.textContent = '🔊';
                }).catch(function () {
                    showToast('تعذّر تشغيل الموسيقى');
                });
            } else {
                music.pause();
                btn.classList.remove('playing');
                btn.textContent = '🎵';
            }
        });
    }

    /* ---------------------------------------------
       10) التنبيهات (Toast)
    --------------------------------------------- */

    var toastTimer = null;

    function showToast(message) {

        var toast = document.getElementById('toast');
        if (!toast) return;

        toast.textContent = message;
        toast.classList.add('show');

        if (toastTimer) window.clearTimeout(toastTimer);

        toastTimer = window.setTimeout(function () {
            toast.classList.remove('show');
        }, 2800);
    }

    /* ---------------------------------------------
       التشغيل
    --------------------------------------------- */

    initPetals();
    initCover();
    initReveal();
    initCountdown();
    initCalendar();
    initAddToCalendar();
    initGuestbook();
    initMusic();

});