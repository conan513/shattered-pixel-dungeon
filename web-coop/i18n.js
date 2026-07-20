/**
 * i18n.js – Shattered Pixel Dungeon Web Co-op
 * Multi-language support matching the original game's 23-language set.
 *
 * Usage:
 *   I18n.setLanguage('hu');
 *   I18n.t('lobby.title');           // → "Pixel Dungeon Co-op"
 *   I18n.applyAll();                 // updates all [data-i18n] elements
 */

const I18n = (() => {

    // ─── Supported Languages ──────────────────────────────────────────────────
    const LANGS = {
        en:      { name: 'English',             flag: '🇬🇧' },
        hu:      { name: 'Magyar',               flag: '🇭🇺' },
        de:      { name: 'Deutsch',              flag: '🇩🇪' },
        fr:      { name: 'Français',             flag: '🇫🇷' },
        es:      { name: 'Español',              flag: '🇪🇸' },
        it:      { name: 'Italiano',             flag: '🇮🇹' },
        pt:      { name: 'Português',            flag: '🇧🇷' },
        nl:      { name: 'Nederlands',           flag: '🇳🇱' },
        pl:      { name: 'Polski',               flag: '🇵🇱' },
        ru:      { name: 'Русский',              flag: '🇷🇺' },
        uk:      { name: 'Українська',           flag: '🇺🇦' },
        be:      { name: 'Беларуская',           flag: '🇧🇾' },
        cs:      { name: 'Čeština',              flag: '🇨🇿' },
        el:      { name: 'Ελληνικά',             flag: '🇬🇷' },
        eo:      { name: 'Esperanto',            flag: '🌐' },
        sv:      { name: 'Svenska',              flag: '🇸🇪' },
        tr:      { name: 'Türkçe',              flag: '🇹🇷' },
        'in':    { name: 'Bahasa Indonesia',     flag: '🇮🇩' },
        ja:      { name: '日本語',                flag: '🇯🇵' },
        ko:      { name: '한국어',                flag: '🇰🇷' },
        vi:      { name: 'Tiếng Việt',           flag: '🇻🇳' },
        zh:      { name: '中文 (简体)',            flag: '🇨🇳' },
        'zh-hant': { name: '中文 (繁體)',          flag: '🇹🇼' },
    };

    // ─── Translation Strings ───────────────────────────────────────────────────
    // Keys mirror the structure used in the game's own UI, for familiarity.
    const STRINGS = {

        // ── Lobby ──────────────────────────────────────────────────────────────
        'lobby.title': {
            en: 'Pixel Dungeon Co-op',
            hu: 'Pixel Dungeon Co-op',
            de: 'Pixel Dungeon Koop',
            fr: 'Pixel Dungeon Coop',
            es: 'Pixel Dungeon Coop',
            it: 'Pixel Dungeon Cooperativo',
            pt: 'Pixel Dungeon Cooperativo',
            ru: 'Pixel Dungeon Кооп',
            ja: 'ピクセルダンジョン 協力プレイ',
            ko: '픽셀 던전 협동',
            zh: '像素地牢 合作版',
        },
        'lobby.subtitle': {
            en: 'Online cooperative multiplayer edition',
            hu: 'Online kooperatív többjátékos kiadás',
            de: 'Online-Koop-Mehrspieleredition',
            fr: 'Édition multijoueur coopérative en ligne',
            es: 'Edición multijugador cooperativa en línea',
            it: 'Edizione multiplayer cooperativa online',
            pt: 'Edição multijogador cooperativa online',
            pl: 'Wydanie trybu kooperatywnego online',
            ru: 'Сетевой кооперативный режим',
            tr: 'Çevrimiçi kooperatif çok oyunculu sürüm',
            ja: 'オンライン協力マルチプレイヤー版',
            ko: '온라인 협동 멀티플레이어 에디션',
            zh: '在线合作多人版',
        },
        'lobby.name_placeholder': {
            en: 'Enter Hero Name',
            hu: 'Add meg a hős nevét',
            de: 'Heldennamen eingeben',
            fr: 'Entrez le nom du héros',
            es: 'Ingresa el nombre del héroe',
            it: 'Inserisci il nome dell\'eroe',
            pt: 'Digite o nome do herói',
            pl: 'Wpisz imię bohatera',
            ru: 'Введите имя героя',
            tr: 'Kahraman adını girin',
            ja: 'ヒーロー名を入力',
            ko: '영웅 이름 입력',
            zh: '输入英雄名称',
        },
        'lobby.play_single': {
            en: 'Play Singleplayer',
            hu: 'Egyjátékos mód',
            de: 'Einzelspieler',
            fr: 'Mode solo',
            es: 'Modo un jugador',
            it: 'Giocatore singolo',
            pt: 'Modo singleplayer',
            pl: 'Tryb jednoosobowy',
            ru: 'Одиночная игра',
            tr: 'Tek oyunculu',
            ja: 'ひとり遊び',
            ko: '싱글플레이',
            zh: '单人游戏',
        },
        'lobby.host': {
            en: 'Host Co-op Game',
            hu: 'Ko-op játék létrehozása',
            de: 'Koop-Spiel hosten',
            fr: 'Héberger une partie coop',
            es: 'Crear partida coop',
            it: 'Ospita partita coop',
            pt: 'Hospedar jogo coop',
            pl: 'Hostuj grę kooperatywną',
            ru: 'Создать кооп-игру',
            tr: 'Koop oyunu barındır',
            ja: '協力ゲームをホスト',
            ko: '협동 게임 호스트',
            zh: '创建合作游戏',
        },
        'lobby.join': {
            en: 'Join Co-op Game',
            hu: 'Ko-op játékhoz csatlakozás',
            de: 'Koop-Spiel beitreten',
            fr: 'Rejoindre une partie coop',
            es: 'Unirse a partida coop',
            it: 'Unisciti a partita coop',
            pt: 'Entrar em jogo coop',
            pl: 'Dołącz do gry kooperatywnej',
            ru: 'Присоединиться к кооп-игре',
            tr: 'Koop oyununa katıl',
            ja: '協力ゲームに参加',
            ko: '협동 게임 참가',
            zh: '加入合作游戏',
        },
        'lobby.waiting': {
            en: 'Waiting for Co-op partner...',
            hu: 'Várakozás a ko-op partnerre...',
            de: 'Warte auf Koop-Partner...',
            fr: 'En attente d\'un partenaire coop...',
            es: 'Esperando compañero de coop...',
            it: 'In attesa del partner coop...',
            pt: 'Aguardando parceiro coop...',
            ru: 'Ожидание кооп-партнёра...',
            ja: '協力パートナーを待っています...',
            ko: '협동 파트너 대기 중...',
            zh: '等待合作伙伴...',
        },
        'lobby.share_code': {
            en: 'Share this Room Code with your friend:',
            hu: 'Oszd meg ezt a szobakódot a barátodnak:',
            de: 'Teile diesen Raumcode mit deinem Freund:',
            fr: 'Partagez ce code de salle avec votre ami:',
            es: 'Comparte este código de sala con tu amigo:',
            it: 'Condividi questo codice sala con il tuo amico:',
            pt: 'Compartilhe este código de sala com seu amigo:',
            ru: 'Поделитесь этим кодом комнаты с другом:',
            ja: 'このルームコードを友達に共有:',
            ko: '이 방 코드를 친구와 공유:',
            zh: '与朋友分享此房间代码：',
        },
        'lobby.cancel': {
            en: 'Cancel',
            hu: 'Mégse',
            de: 'Abbrechen',
            fr: 'Annuler',
            es: 'Cancelar',
            it: 'Annulla',
            pt: 'Cancelar',
            pl: 'Anuluj',
            ru: 'Отмена',
            tr: 'İptal',
            ja: 'キャンセル',
            ko: '취소',
            zh: '取消',
        },
        'lobby.enter_code': {
            en: 'Enter Host Room Code',
            hu: 'Add meg a szobakódot',
            de: 'Host-Raumcode eingeben',
            fr: 'Entrez le code de la salle hôte',
            es: 'Ingresa el código de sala del host',
            ru: 'Введите код комнаты хоста',
            ja: 'ホストのルームコードを入力',
            ko: '호스트 방 코드 입력',
            zh: '输入主机房间代码',
        },
        'lobby.connect': {
            en: 'Connect & Play',
            hu: 'Csatlakozás & Játék',
            de: 'Verbinden & Spielen',
            fr: 'Connecter & Jouer',
            es: 'Conectar y Jugar',
            it: 'Connetti e Gioca',
            pt: 'Conectar e Jogar',
            ru: 'Подключиться и играть',
            ja: '接続してプレイ',
            ko: '연결 후 플레이',
            zh: '连接并游戏',
        },
        'lobby.back': {
            en: 'Back',
            hu: 'Vissza',
            de: 'Zurück',
            fr: 'Retour',
            es: 'Volver',
            it: 'Indietro',
            pt: 'Voltar',
            pl: 'Wróć',
            ru: 'Назад',
            tr: 'Geri',
            ja: '戻る',
            ko: '뒤로',
            zh: '返回',
        },

        // ── Class Selection ────────────────────────────────────────────────────
        'class.choose': {
            en: 'Choose Your Hero Class',
            hu: 'Válaszd ki a hősosztályod',
            de: 'Wähle deine Heldenklasse',
            fr: 'Choisissez votre classe de héros',
            es: 'Elige tu clase de héroe',
            it: 'Scegli la tua classe eroe',
            pt: 'Escolha sua classe de herói',
            pl: 'Wybierz klasę bohatera',
            ru: 'Выберите класс героя',
            tr: 'Kahraman sınıfını seç',
            ja: 'ヒーロークラスを選択',
            ko: '영웅 클래스 선택',
            zh: '选择你的英雄职业',
        },
        'class.descend': {
            en: 'Descend Into Dungeon',
            hu: 'Alászállás a dungeonba',
            de: 'Ins Dungeon absteigen',
            fr: 'Descendre dans le donjon',
            es: 'Descender al calabozo',
            it: 'Scendi nel dungeon',
            pt: 'Descer para o calabouço',
            pl: 'Zejdź do lochu',
            ru: 'Спуститься в подземелье',
            tr: 'Zindana in',
            ja: 'ダンジョンへ降りる',
            ko: '던전으로 내려가기',
            zh: '进入地牢',
        },

        // ── Warrior ───────────────────────────────────────────────────────────
        'hero.warrior.name': {
            en: 'WARRIOR', hu: 'HARCOS', de: 'KRIEGER', fr: 'GUERRIER',
            es: 'GUERRERO', it: 'GUERRIERO', pt: 'GUERREIRO', pl: 'WOJOWNIK',
            ru: 'ВОИН', tr: 'SAVAŞÇI', ja: '戦士', ko: '전사', zh: '战士',
        },
        'hero.warrior.desc': {
            en: 'High health and damage threshold. Starts with a worn shortsword.',
            hu: 'Magas életpont és sebzésküszöb. Kopott rövidkarddal indul.',
            de: 'Hohe Gesundheit und Schadensschwelle. Beginnt mit einem abgenutzten Kurzschwert.',
            fr: 'Haute santé et seuil de dégâts. Commence avec une épée courte usée.',
            es: 'Alta salud y umbral de daño. Comienza con una espada corta desgastada.',
            it: 'Alta salute e soglia di danno. Inizia con una spada corta usurata.',
            pt: 'Alta saúde e limiar de dano. Começa com uma espada curta gasta.',
            pl: 'Wysoka moc i próg obrażeń. Zaczyna ze zużytą krótką mieczem.',
            ru: 'Высокое здоровье и порог урона. Начинает с поношенным коротким мечом.',
            ja: '高い体力とダメージ閾値。使い古しのショートソードからスタート。',
            ko: '높은 체력과 피해 임계값. 낡은 쇼트소드로 시작.',
            zh: '高生命值和伤害阈值。从磨损的短剑开始。',
        },

        // ── Mage ─────────────────────────────────────────────────────────────
        'hero.mage.name': {
            en: 'MAGE', hu: 'MÁGUS', de: 'MAGIER', fr: 'MAGE',
            es: 'MAGO', it: 'MAGO', pt: 'MAGO', pl: 'MAG',
            ru: 'МАГ', tr: 'BÜYÜCÜ', ja: '魔法使い', ko: '마법사', zh: '法师',
        },
        'hero.mage.desc': {
            en: 'Fires magical charges. Heals slightly on kills. Starts with a wand.',
            hu: 'Varázstöltéseket lő ki. Kis gyógyulás haláloknál. Pálcával indul.',
            de: 'Feuert magische Ladungen. Heilt leicht beim Töten. Beginnt mit einem Zauberstab.',
            fr: 'Tire des charges magiques. Se soigne légèrement en tuant. Commence avec une baguette.',
            es: 'Dispara cargas mágicas. Se cura ligeramente al matar. Comienza con una varita.',
            it: 'Spara cariche magiche. Si cura leggermente uccidendo. Inizia con una bacchetta.',
            pt: 'Dispara cargas mágicas. Cura levemente ao matar. Começa com uma varinha.',
            ru: 'Стреляет магическими зарядами. Лечится при убийствах. Начинает с жезлом.',
            ja: '魔法の弾を発射。敵を倒すと少し回復。杖からスタート。',
            ko: '마법 탄환 발사. 처치 시 약간 회복. 지팡이로 시작.',
            zh: '发射魔法弹药。击杀时小量治疗。从法杖开始。',
        },

        // ── Rogue ─────────────────────────────────────────────────────────────
        'hero.rogue.name': {
            en: 'ROGUE', hu: 'GAZEMBER', de: 'SCHURKE', fr: 'VOLEUR',
            es: 'PÍCARO', it: 'LADRO', pt: 'LADINO', pl: 'ŁOTRZYK',
            ru: 'ПЛУТ', tr: 'HAYDUt', ja: 'ローグ', ko: '도적', zh: '盗贼',
        },
        'hero.rogue.desc': {
            en: 'Stealthy scout. Escapes fights easily. Starts with a dagger.',
            hu: 'Lopakodó felderítő. Könnyen megmenekül a harcoktól. Tőrrel indul.',
            de: 'Heimlicher Kundschafter. Entkommt Kämpfen leicht. Beginnt mit einem Dolch.',
            fr: 'Éclaireur furtif. S\'échappe facilement des combats. Commence avec une dague.',
            es: 'Explorador sigiloso. Escapa fácilmente de las peleas. Comienza con una daga.',
            it: 'Esploratore furtivo. Sfugge facilmente ai combattimenti. Inizia con un pugnale.',
            pt: 'Batedora furtiva. Escapa facilmente de lutas. Começa com uma adaga.',
            ru: 'Скрытный разведчик. Легко уходит от боя. Начинает с кинжалом.',
            ja: 'ステルス偵察兵。戦闘から逃げやすい。短剣からスタート。',
            ko: '은신 정찰병. 전투에서 쉽게 도망. 단검으로 시작.',
            zh: '隐身侦察兵。容易逃出战斗。从匕首开始。',
        },

        // ── Huntress ──────────────────────────────────────────────────────────
        'hero.huntress.name': {
            en: 'HUNTRESS', hu: 'VADÁSZNŐ', de: 'JÄGERIN', fr: 'CHASSERESSE',
            es: 'CAZADORA', it: 'CACCIATRICE', pt: 'CAÇADORA', pl: 'ŁOWCZYNI',
            ru: 'ОХОТНИЦА', tr: 'AVCIKADIN', ja: '狩人', ko: '사냥꾼', zh: '猎手',
        },
        'hero.huntress.desc': {
            en: 'Ranged sniper. Long vision sight. Starts with a spirit bow.',
            hu: 'Távolsági mesterlövész. Nagy látótáv. Szellemíjjal indul.',
            de: 'Fernkämpfer-Scharfschützin. Große Sichtweite. Beginnt mit einem Geisterbogen.',
            fr: 'Sniper à distance. Grande portée de vision. Commence avec un arc spirituel.',
            es: 'Francotiradora a distancia. Larga visión. Comienza con un arco espiritual.',
            it: 'Cecchina a distanza. Lunga visione. Inizia con un arco spirituale.',
            pt: 'Atiradora à distância. Longa visão. Começa com um arco espiritual.',
            ru: 'Дальний снайпер. Большая дальность обзора. Начинает с духовным луком.',
            ja: '遠距離スナイパー。長い視野。霊弓からスタート。',
            ko: '원거리 저격수. 긴 시야. 정령 활로 시작.',
            zh: '远程狙击手。长视野。从灵弓开始。',
        },

        // ── HUD Labels ────────────────────────────────────────────────────────
        'hud.hp':      { en: 'HP', hu: 'ÉP', de: 'LP', fr: 'PV', es: 'PV', it: 'PS', pt: 'PV', ru: 'ОЗ', ja: 'HP', ko: 'HP', zh: '生命' },
        'hud.level':   { en: 'Level', hu: 'Szint', de: 'Stufe', fr: 'Niveau', es: 'Nivel', it: 'Livello', pt: 'Nível', pl: 'Poziom', ru: 'Уровень', tr: 'Seviye', ja: 'レベル', ko: '레벨', zh: '等级' },
        'hud.gold':    { en: 'Gold', hu: 'Arany', de: 'Gold', fr: 'Or', es: 'Oro', it: 'Oro', pt: 'Ouro', pl: 'Złoto', ru: 'Золото', tr: 'Altın', ja: 'ゴールド', ko: '골드', zh: '金币' },
        'hud.depth':   { en: 'Dungeon Depth', hu: 'Mélység', de: 'Dungeon-Tiefe', fr: 'Profondeur', es: 'Profundidad', it: 'Profondità', pt: 'Profundidade', pl: 'Głębokość', ru: 'Глубина', tr: 'Derinlik', ja: '深さ', ko: '깊이', zh: '深度' },
        'hud.hunger':  { en: 'Hunger', hu: 'Éhség', de: 'Hunger', fr: 'Faim', es: 'Hambre', it: 'Fame', pt: 'Fome', pl: 'Głód', ru: 'Голод', tr: 'Açlık', ja: '空腹', ko: '허기', zh: '饥饿' },

        // ── Action Belt ───────────────────────────────────────────────────────
        'action.inv':  { en: 'INV', hu: 'TÁRGY', de: 'INV', fr: 'INV', es: 'INV', it: 'INV', ru: 'ИНВ', ja: 'アイテム', ko: '인벤', zh: '背包' },
        'action.wait': { en: 'WAIT', hu: 'VÁR', de: 'WARTEN', fr: 'PASSER', es: 'ESPERAR', it: 'ASPETTA', ru: 'ЖДАТЬ', ja: '待機', ko: '대기', zh: '等待' },
        'action.skip': { en: 'SKIP', hu: 'UGRÁS', de: 'ÜBERSPRINGEN', fr: 'PASSER', es: 'SALTAR', it: 'SALTA', ru: 'ПРОПУСТИТЬ', ja: 'スキップ', ko: '스킵', zh: '跳过' },
        'action.quit': { en: 'QUIT', hu: 'KILÉPÉS', de: 'BEENDEN', fr: 'QUITTER', es: 'SALIR', it: 'ESCI', ru: 'ВЫЙТИ', ja: '終了', ko: '종료', zh: '退出' },
        'action.map':  { en: 'MAP', hu: 'TÉRKÉP', de: 'KARTE', fr: 'CARTE', es: 'MAPA', it: 'MAPPA', ru: 'КАРТА', ja: '地図', ko: '지도', zh: '地图' },

        // ── Controls ──────────────────────────────────────────────────────────
        'controls.title': {
            en: 'Keyboard Controls:', hu: 'Billentyűzet:', de: 'Steuerung:', fr: 'Commandes clavier:',
            es: 'Controles:', it: 'Controlli tastiera:', ru: 'Управление:', ja: 'キーボード操作:', ko: '키보드 조작:', zh: '键盘操控：',
        },
        'controls.move': {
            en: 'W/A/S/D or Arrows to move/attack.',
            hu: 'W/A/S/D vagy Nyilak mozgáshoz/támadáshoz.',
            de: 'W/A/S/D oder Pfeile zum Bewegen/Angreifen.',
            fr: 'W/A/S/D ou Flèches pour se déplacer/attaquer.',
            es: 'W/A/S/D o Flechas para mover/atacar.',
            it: 'W/A/S/D o Frecce per muoversi/attaccare.',
            ru: 'W/A/S/D или стрелки для движения/атаки.',
            ja: 'W/A/S/Dまたは矢印キーで移動/攻撃。',
            ko: 'W/A/S/D 또는 화살표로 이동/공격.',
            zh: 'W/A/S/D 或方向键移动/攻击。',
        },
        'controls.wait': {
            en: 'Spacebar to wait a turn.',
            hu: 'Szóköz egy kör várakozáshoz.',
            de: 'Leertaste, um eine Runde zu warten.',
            fr: 'Barre d\'espace pour passer un tour.',
            es: 'Barra espaciadora para esperar un turno.',
            it: 'Barra spaziatrice per aspettare un turno.',
            ru: 'Пробел, чтобы пропустить ход.',
            ja: 'スペースキーでターンを待機。',
            ko: '스페이스바로 한 턴 대기.',
            zh: '空格键等待一回合。',
        },
        'controls.click': {
            en: 'Mouse Click nearby tiles to interact.',
            hu: 'Egér kattintás közeli cellákra az interakcióhoz.',
            de: 'Mausklick auf nahe Felder zum Interagieren.',
            fr: 'Clic de souris sur les cases proches pour interagir.',
            es: 'Clic del ratón en celdas cercanas para interactuar.',
            ru: 'Щёлчок мышью по соседним клеткам для взаимодействия.',
            ja: '近くのタイルをマウスクリックで操作。',
            ko: '근처 타일 마우스 클릭으로 상호작용.',
            zh: '鼠标点击附近格子进行交互。',
        },
        'controls.map': {
            en: 'M – Toggle mini-map.',
            hu: 'M – Mini-térkép ki/be.',
            de: 'M – Mini-Karte umschalten.',
            fr: 'M – Basculer la mini-carte.',
            es: 'M – Alternar minimapa.',
            ru: 'M – Переключить мини-карту.',
            ja: 'M – ミニマップの切り替え。',
            ko: 'M – 미니맵 토글.',
            zh: 'M – 切换小地图。',
        },

        // ── Inventory ─────────────────────────────────────────────────────────
        'inv.title':    { en: 'Hero Inventory', hu: 'Hős leltár', de: 'Helden-Inventar', fr: 'Inventaire du héros', es: 'Inventario del héroe', it: 'Inventario eroe', pt: 'Inventário do herói', ru: 'Инвентарь героя', ja: 'ヒーローの持ち物', ko: '영웅 인벤토리', zh: '英雄背包' },
        'inv.select':   { en: 'Select an item to view description.', hu: 'Válassz tárgyat a leíráshoz.', de: 'Wähle einen Gegenstand für die Beschreibung.', fr: 'Sélectionnez un objet pour voir sa description.', es: 'Selecciona un objeto para ver su descripción.', ru: 'Выберите предмет для описания.', ja: 'アイテムを選択して説明を表示。', ko: '아이템을 선택해 설명 보기.', zh: '选择物品查看描述。' },
        'inv.use':      { en: 'Use / Consume', hu: 'Használ / Fogyaszt', de: 'Benutzen', fr: 'Utiliser', es: 'Usar', it: 'Usa', ru: 'Использовать', ja: '使用', ko: '사용', zh: '使用' },
        'inv.close':    { en: 'Close', hu: 'Bezár', de: 'Schließen', fr: 'Fermer', es: 'Cerrar', it: 'Chiudi', ru: 'Закрыть', ja: '閉じる', ko: '닫기', zh: '关闭' },

        // ── Chat ──────────────────────────────────────────────────────────────
        'chat.placeholder': {
            en: 'Type a message to your co-op partner...',
            hu: 'Írj üzenetet a ko-op partnernek...',
            de: 'Schreib eine Nachricht an deinen Koop-Partner...',
            fr: 'Tapez un message à votre partenaire coop...',
            es: 'Escribe un mensaje a tu compañero de coop...',
            ru: 'Напишите сообщение кооп-партнёру...',
            ja: '協力パートナーにメッセージ...',
            ko: '협동 파트너에게 메시지...',
            zh: '给合作伙伴发消息...',
        },
        'chat.send': {
            en: 'Send', hu: 'Küld', de: 'Senden', fr: 'Envoyer', es: 'Enviar',
            it: 'Invia', pt: 'Enviar', ru: 'Отправить', ja: '送信', ko: '보내기', zh: '发送',
        },
        'chat.welcome': {
            en: 'Welcome to Shattered Pixel Dungeon Co-op. Use WASD/Arrows to navigate.',
            hu: 'Üdvözlünk a Shattered Pixel Dungeon Ko-opban. Mozgáshoz használd a WASD/Nyilakat.',
            de: 'Willkommen bei Shattered Pixel Dungeon Koop. WASD/Pfeile zum Navigieren.',
            fr: 'Bienvenue dans Shattered Pixel Dungeon Coop. Utilisez WASD/Flèches pour naviguer.',
            es: 'Bienvenido a Shattered Pixel Dungeon Coop. Usa WASD/Flechas para navegar.',
            ru: 'Добро пожаловать в Shattered Pixel Dungeon Кооп. WASD/стрелки для навигации.',
            ja: 'Shattered Pixel Dungeon Coopへようこそ。WASD/矢印で移動。',
            ko: 'Shattered Pixel Dungeon 협동에 오신 것을 환영합니다. WASD/화살표로 이동.',
            zh: '欢迎来到碎片像素地牢合作版。使用WASD/方向键导航。',
        },

        // ── Hunger States ─────────────────────────────────────────────────────
        'hunger.well_fed': { en: 'Well Fed', hu: 'Jóllakott', de: 'Satt', fr: 'Rassasié', es: 'Saciado', it: 'Sazio', ru: 'Сыт', ja: '満腹', ko: '포만', zh: '饱足' },
        'hunger.hungry':   { en: 'Hungry', hu: 'Éhes', de: 'Hungrig', fr: 'Affamé', es: 'Hambriento', it: 'Affamato', ru: 'Голоден', ja: '空腹', ko: '배고픔', zh: '饥饿' },
        'hunger.starving': { en: 'STARVING', hu: 'ÉHEZIK!', de: 'VERHUNGERT!', fr: 'AFFAMÉ!', es: '¡HAMBRE!', it: 'AFFAMATO!', ru: 'ГОЛОДАЕТ!', ja: '飢え！', ko: '굶주림!', zh: '极度饥饿！' },

        // ── Items ─────────────────────────────────────────────────────────────
        'item.healing_potion': {
            en: 'Healing Potion', hu: 'Gyógyító bájital', de: 'Heiltrank', fr: 'Potion de soin',
            es: 'Poción curativa', it: 'Pozione curativa', pt: 'Poção de cura', ru: 'Зелье лечения',
            ja: '回復薬', ko: '치유 물약', zh: '治疗药水',
        },
        'item.scroll_magic_map': {
            en: 'Scroll of Magic Map', hu: 'Varázstérkép tekercs', de: 'Zauberkarte-Schriftrolle', fr: 'Parchemin de carte magique',
            es: 'Pergamino del mapa mágico', it: 'Pergamena della mappa magica', ru: 'Свиток волшебной карты',
            ja: '魔法の地図の巻物', ko: '마법 지도 두루마리', zh: '魔法地图卷轴',
        },
        'item.ration': {
            en: 'Food Ration', hu: 'Élelmiszerkészlet', de: 'Nahrungsration', fr: 'Ration alimentaire',
            es: 'Ración de comida', it: 'Razione alimentare', ru: 'Паёк',
            ja: '食料', ko: '식량', zh: '口粮',
        },

        // ── Traps ─────────────────────────────────────────────────────────────
        'trap.activated': {
            en: 'A trap is triggered!',
            hu: 'Csapda aktiválódott!',
            de: 'Eine Falle wird ausgelöst!',
            fr: 'Un piège se déclenche!',
            es: '¡Se activa una trampa!',
            it: 'Una trappola scatta!',
            ru: 'Активирована ловушка!',
            ja: '罠が発動した！',
            ko: '함정이 작동했습니다!',
            zh: '陷阱被触发！',
        },

        // ── System Messages ───────────────────────────────────────────────────
        'msg.depth_generated': {
            en: 'Dungeon depth {d} generated. Beware!',
            hu: 'Dungeon {d}. szint generálva. Vigyázz!',
            de: 'Dungeon-Tiefe {d} generiert. Vorsicht!',
            fr: 'Profondeur du donjon {d} générée. Attention!',
            es: 'Profundidad de calabozo {d} generada. ¡Cuidado!',
            it: 'Profondità del dungeon {d} generata. Attenzione!',
            ru: 'Уровень {d} подземелья сгенерирован. Берегись!',
            ja: 'ダンジョン深度{d}が生成されました。気をつけて！',
            ko: '던전 깊이 {d} 생성됨. 조심하세요!',
            zh: '地牢深度{d}已生成。小心！',
        },
        'msg.descended': {
            en: 'Descended to dungeon depth {d}. The air grows colder.',
            hu: 'Leszálltál a {d}. szintre. A levegő egyre hidegebb.',
            de: 'Dungeon-Tiefe {d} erreicht. Die Luft wird kälter.',
            fr: 'Descendu à la profondeur {d}. L\'air devient plus froid.',
            es: 'Descendiste a la profundidad {d}. El aire se vuelve más frío.',
            it: 'Sceso alla profondità {d}. L\'aria diventa più fredda.',
            ru: 'Спустился на глубину {d}. Воздух становится холоднее.',
            ja: '深度{d}に降りた。空気がより冷たくなる。',
            ko: '던전 깊이 {d}로 내려감. 공기가 차가워진다.',
            zh: '下降到地牢深度{d}。空气越来越冷。',
        },
        'msg.level_up': {
            en: '{n} leveled up to level {l}!',
            hu: '{n} szintet lépett! Most {l}. szint.',
            de: '{n} ist auf Stufe {l} aufgestiegen!',
            fr: '{n} a atteint le niveau {l}!',
            es: '¡{n} subió al nivel {l}!',
            it: '{n} ha raggiunto il livello {l}!',
            ru: '{n} достиг уровня {l}!',
            ja: '{n}はレベル{l}になった！',
            ko: '{n}이(가) {l}레벨로 올랐습니다!',
            zh: '{n}升级到{l}级！',
        },
        'msg.you_died': {
            en: 'YOU DIED',
            hu: 'MEGHALTÁL',
            de: 'DU BIST GESTORBEN',
            fr: 'VOUS ÊTES MORT',
            es: 'HAS MUERTO',
            it: 'SEI MORTO',
            pt: 'VOCÊ MORREU',
            pl: 'ZGINĄŁEŚ',
            ru: 'ВЫ ПОГИБЛИ',
            tr: 'ÖLDÜN',
            ja: 'あなたは死んだ',
            ko: '당신은 죽었습니다',
            zh: '你已死亡',
        },
        'msg.restart': {
            en: 'Press F5 to restart',
            hu: 'F5 az újraindításhoz',
            de: 'F5 zum Neustart drücken',
            fr: 'Appuyez sur F5 pour redémarrer',
            es: 'Presiona F5 para reiniciar',
            ru: 'Нажмите F5 для перезапуска',
            ja: 'F5で再起動',
            ko: 'F5로 재시작',
            zh: '按F5重新开始',
        },
    };

    // ─── Internal State ────────────────────────────────────────────────────────
    let currentLang = 'en';

    // ─── Public API ────────────────────────────────────────────────────────────
    return {
        LANGS,

        /** Returns the translation for a key in the current language, falling back to English. */
        t(key, vars = {}) {
            const entry = STRINGS[key];
            if (!entry) return key; // Return the key itself if not found
            let str = entry[currentLang] || entry['en'] || key;
            // Variable substitution: {d}, {n}, {l} etc.
            for (const [k, v] of Object.entries(vars)) {
                str = str.replaceAll(`{${k}}`, v);
            }
            return str;
        },

        /** Set the active language and refresh all data-i18n elements. */
        setLanguage(code) {
            if (!LANGS[code]) code = 'en';
            currentLang = code;
            document.documentElement.lang = code;
            localStorage.setItem('spd_lang', code);
            this.applyAll();
        },

        /** Current language code getter */
        get lang() { return currentLang; },

        /** Refresh all elements that have a data-i18n attribute. */
        applyAll() {
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                const attr = el.getAttribute('data-i18n-attr');
                const val = this.t(key);
                if (attr) {
                    el.setAttribute(attr, val);
                } else {
                    el.textContent = val;
                }
            });
            // Update chat welcome message (first message in log)
            const firstMsg = document.querySelector('#chatLog .chat-msg.system');
            if (firstMsg) firstMsg.textContent = this.t('chat.welcome');
        },

        /** Initialize: load saved language from localStorage. */
        init() {
            const saved = localStorage.getItem('spd_lang') || navigator.language?.split('-')[0] || 'en';
            const code = LANGS[saved] ? saved : 'en';
            this.setLanguage(code);
        },

        /** Build and return the language selector dropdown HTML. */
        buildSelector() {
            const sel = document.createElement('select');
            sel.id = 'langSelector';
            sel.className = 'lang-selector';
            sel.title = 'Language / Nyelv';
            for (const [code, meta] of Object.entries(LANGS)) {
                const opt = document.createElement('option');
                opt.value = code;
                opt.textContent = `${meta.flag} ${meta.name}`;
                if (code === currentLang) opt.selected = true;
                sel.appendChild(opt);
            }
            sel.addEventListener('change', () => this.setLanguage(sel.value));
            return sel;
        }
    };
})();
