# Shopify Entegrasyonu - En İyi Yöntem (Sections)

Bu talimatlar, anket uygulamasını Shopify temanıza en sağlam ve hatasız yöntemle eklemenizi sağlayacaktır. Lütfen adımları sırasıyla takip edin.

### Adım 1: Yeni Bir Shopify "Section" Dosyası Oluşturun

Bu, anketimizi temanızın geri kalanından izole eder ve tema güncellemelerinden etkilenmemesini sağlar.

1.  Shopify Admin panelinizden **Online Store > Themes** (Online Mağaza > Temalar) bölümüne gidin.
2.  Mevcut temanızın yanındaki üç noktaya **(...)** tıklayın ve **"Edit code"** (Kodu düzenle) seçeneğini seçin.
3.  Soldaki dosya listesinden **Sections** klasörünü bulun ve tıklayarak açın.
4.  **"Add a new section"** (Yeni bölüm ekle) linkine tıklayın.
5.  Açılan pencereye dosya adı olarak **`dekorla-survey-section`** yazın ve **"Create section"** (Bölüm oluştur) butonuna tıklayın.
6.  Oluşturduğunuz `dekorla-survey-section.liquid` dosyasının içindeki **tüm mevcut kodları silin** ve aşağıdaki yeni kodu **aynen yapıştırın**:

```html
<div id="dekorla-survey-container">
  <!-- 
    Bu kod, giriş yapmış bir müşteri varsa, e-posta adresini güvenli bir şekilde 
    aşağıdaki 'root' elementine bir data attribute olarak ekler.
    Bu, üçüncü parti uygulamalardan veya önbellekleme sorunlarından etkilenmeyen en güvenilir yöntemdir.
  -->
  <div id="root" {% if customer %}data-customer-email="{{ customer.email | escape }}"{% endif %}>
     <div style="text-align: center; padding: 4rem 1rem; font-family: sans-serif; color: #333;">
        Anket Yükleniyor... Lütfen bekleyin.
     </div>
  </div>
</div>

{{ 'index.css' | asset_url | stylesheet_tag }}

<script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
<script src="{{ 'index.js' | asset_url }}" defer="defer"></script>

{% schema %}
  {
    "name": "Dekorla Anket Uygulaması",
    "class": "dekorla-survey-section",
    "settings": [],
    "presets": [
      {
        "name": "Dekorla Anket Uygulaması"
      }
    ]
  }
{% endschema %}
```
7.  Sağ üstteki **"Save"** (Kaydet) butonuna tıklayın.

### Adım 2: Gerekli Dosyaları "Assets" Klasörüne Yükleyin

1.  Yine kod düzenleyicide, soldaki menüden **Assets** klasörünü bulun ve açın.
2.  **ÇOK ÖNEMLİ:** `Assets` klasörünün içinde, eğer mevcutsa, eski **`index.css`** ve **`index.js`** dosyalarını bulun ve üzerlerine tıklayıp **"Delete file"** (Dosyayı sil) butonuna basarak **SİLİN**. Bu adım, önbellek sorunlarını önlemek için kritiktir.
3.  **"Add a new asset"** (Yeni asset ekle) butonunu kullanın.
4.  Projenizdeki **`index.css`** ve **`index.js`** dosyalarını bu klasöre yükleyin.

### Adım 3: Anketi Sayfaya Ekleyin

1.  Kod düzenleyiciden çıkın ve **Online Store > Pages** (Online Mağaza > Sayfalar) bölümüne gidin ve anket için kullanacağınız sayfayı açın (örn: "Tasarım Keşif Anketi").
2.  Sayfa içeriğini (content) tamamen boşaltın.
3.  Sağ alttaki "Theme template" (Tema şablonu) bölümünde, varsayılan şablon yerine **`dekorla-survey-section`** adında yeni bir şablon oluşturmanız gerekebilir veya temanızın "Özelleştir" (Customize) arayüzünü kullanabilirsiniz.

#### **En Kolay Yöntem (Tema Özelleştirici):**

1.  **Online Store > Themes**'e geri dönün. Temanızın yanındaki **"Customize"** (Özelleştir) butonuna tıklayın.
2.  Üstteki orta açılır menüden **Pages > Tasarım Keşif Anketi** sayfasını seçerek anket sayfanızın önizlemesine gidin.
3.  Soldaki menüde, **"Add section"** (Bölüm ekle) butonuna tıklayın.
4.  Açılan listeden, az önce oluşturduğunuz **"Dekorla Anket Uygulaması"** bölümünü bulun ve seçin.
5.  **ÖNEMLİ:** Sayfadaki diğer tüm bölümleri (genellikle "Page" veya "Sayfa" başlıklı olanı) gizlemek için yanındaki göz ikonuna tıklayın veya kaldırın. Bu, sadece anketin görünmesini sağlar.
6.  Sağ üstteki **"Save"** (Kaydet) butonuna tıklayın.

Bu adımlardan sonra anketiniz sayfanızda modern ve sorunsuz bir şekilde çalışacaktır.