# Shopify Entegrasyonu - Kesin ve Nihai Çözüm

Bu talimatlar, anket uygulamasını Shopify temanıza en sağlam ve hatasız yöntemle eklemenizi sağlayacaktır. Lütfen adımları sırasıyla takip edin.

### Adım 1: Yeni Bir Shopify "Section" Dosyası Oluşturun

Bu, anketimizi temanızın geri kalanından izole edecektir.

1.  Shopify Admin panelinizden **Online Store > Themes** (Online Mağaza > Temalar) bölümüne gidin.
2.  Mevcut temanızın yanındaki üç noktaya **(...)** tıklayın ve **"Edit code"** (Kodu düzenle) seçeneğini seçin.
3.  Soldaki dosya listesinden **Sections** klasörünü bulun ve tıklayarak açın.
4.  **"Add a new section"** (Yeni bölüm ekle) linkine tıklayın.
5.  Açılan pencereye dosya adı olarak **`survey-app`** yazın ve **"Create section"** (Bölüm oluştur) butonuna tıklayın.
6.  Oluşturduğunuz `survey-app.liquid` dosyasının içindeki **tüm mevcut kodları silin** ve aşağıdaki yeni kodu **aynen yapıştırın**:

```html
<div id="dekorla-survey-app" class="page-width page-content">
  <!-- 
    Bu kod, giriş yapmış bir müşteri varsa, e-posta adresini güvenli bir şekilde 
    aşağıdaki 'root' elementine bir data attribute olarak ekler.
    Bu, üçüncü parti uygulamalardan veya önbellekleme sorunlarından etkilenmeyen en güvenilir yöntemdir.
  -->
  <div id="root" {% if customer %}data-customer-email="{{ customer.email | escape }}"{% endif %}>
     <div style="text-align: center; padding: 4rem 1rem; font-family: sans-serif; color: #333;">
        Anket Yükleniyor...
     </div>
  </div>
</div>

<link rel="stylesheet" href="{{ 'index.css' | asset_url }}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

<script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
<script src="{{ 'index.js' | asset_url }}" defer></script>

{% schema %}
  {
    "name": "Dekorla Survey App",
    "settings": [],
    "presets": [
      {
        "name": "Dekorla Survey App"
      }
    ]
  }
{% endschema %}
```
7.  Sağ üstteki **"Save"** (Kaydet) butonuna tıklayın.

### Adım 2: Stil (`index.css`) ve JavaScript (`index.js`) Dosyalarını Güncelleyin

1.  Yine kod düzenleyicide, soldaki menüden **Assets** klasörünü bulun ve açın.
2.  Mevcut **`index.css`** dosyasını açın, içindeki her şeyi silin ve size verilen yeni `index.css` kodunu yapıştırın. Ardından kaydedin.
3.  Mevcut **`index.js`** dosyasını açın, içindeki her şeyi silin ve size verilen yeni `index.js` kodunu yapıştırın. Ardından kaydedin.

### Adım 3: Anketi Sayfaya Ekleyin

1.  Kod düzenleyiciden çıkın ve **Online Store > Themes**'e geri dönün. Temanızın yanındaki **"Customize"** (Özelleştir) butonuna tıklayın.
2.  Üstteki orta açılır menüden **Pages > Tasarım Keşif Anketi** sayfasını seçerek anket sayfanızın önizlemesine gidin.
3.  Soldaki menüde, **"Add section"** (Bölüm ekle) butonuna tıklayın.
4.  Açılan listeden, az önce oluşturduğunuz **"Dekorla Survey App"** bölümünü bulun ve seçin.
5.  (İsteğe bağlı) Sayfadaki diğer tüm bölümleri (genellikle "Page" veya "Sayfa" başlıklı olanı) gizleyin veya kaldırın. Bu, sadece anketin görünmesini sağlar.
6.  Sağ üstteki **"Save"** (Kaydet) butonuna tıklayın.

Bu adımlardan sonra anketiniz sayfanızda sorunsuz bir şekilde çalışacaktır.