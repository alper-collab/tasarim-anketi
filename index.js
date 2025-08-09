// This script is designed to run after the main document and ALL resources (including theme scripts) are loaded.
window.addEventListener('load', () => {
  try {
    // Check if React and ReactDOM have been loaded from the CDN
    if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
      throw new Error("HATA: React veya ReactDOM kütüphaneleri yüklenemedi. Anket başlatılamıyor.");
    }

    const { useState, useMemo, useCallback, createElement, Fragment } = React;
    const { createRoot } = ReactDOM;

    const questions = [
        {
            id: 'fullName',
            text: 'Adınız Soyadınız',
            type: 'text',
            required: true,
            layout: 'horizontal',
            placeholder: 'Adınızı ve soyadınızı girin'
        },
        {
            id: 'email',
            text: 'Email Adresiniz',
            type: 'email',
            required: true,
            layout: 'horizontal'
        },
        {
            id: 'phone',
            text: 'Telefon Numaranız',
            type: 'text',
            required: true,
            layout: 'horizontal',
            placeholder: ' ör. 555 123 4567'
        },
        {
            id: 'spaceType',
            text: 'Tasarım yapılacak mekanın türü nedir?',
            type: 'radio',
            required: true,
            layout: 'vertical',
            options: ['Ev', 'Ofis', 'Mağaza', 'Restoran/Kafe', 'Diğer'],
            hasOtherSpecify: true
        },
        {
            id: 'rooms',
            text: 'Hangi odalar veya alanlar için tasarım hizmeti düşünüyorsunuz?',
            type: 'checkbox',
            required: true,
            layout: 'vertical',
            options: ['Salon', 'Mutfak', 'Yatak Odası', 'Banyo', 'Çalışma Odası', 'Antre/Giriş', 'Teras/Balkon', 'Diğer'],
            hasOtherSpecify: true
        },
        {
            id: 'floorPlan',
            text: 'Mevcut durum fotoğraflarını ve/veya mekanın ölçülü planını yükleyebilir misiniz?',
            type: 'file',
            required: false,
            multiple: true,
            accept: 'image/*,application/pdf,.zip,.rar',
            layout: 'vertical'
        },
        {
            id: 'designStyle',
            text: 'Hangi tasarım stilini veya stillerini beğeniyorsunuz?',
            type: 'checkbox',
            required: true,
            layout: 'vertical',
            grid: true,
            options: ['Modern', 'Minimalist', 'Klasik', 'Rustik/Country', 'Endüstriyel', 'Bohem', 'Eklektik (Farklı stillerin karışımı)', 'Bilmiyorum/Kararsızım']
        },
        {
            id: 'colorPalette',
            text: 'Renk paletinizde hangi tonları tercih edersiniz?',
            type: 'checkbox',
            required: true,
            layout: 'vertical',
            options: ['Nötr tonlar (beyaz, gri, bej)', 'Sıcak renkler (kırmızı, turuncu, sarı)', 'Soğuk renkler (mavi, yeşil, mor)', 'Pastel tonlar', 'Koyu ve dramatik renkler']
        },
        {
            id: 'budget',
            text: 'Tasarım süreci için ayırdığınız yaklaşık bütçe nedir?',
            type: 'radio',
            required: true,
            layout: 'vertical',
            options: ['50.000 TL - 100.000 TL', '100.000 TL - 250.000 TL', '250.000 TL - 500.000 TL', '500.000 TL ve üzeri', 'Bütçe belirtmek istemiyorum'],
            hasOtherSpecify: false
        },
        {
            id: 'timeline',
            text: 'Projenin başlaması için hedeflediğiniz bir tarih var mı?',
            type: 'text',
            required: false,
            layout: 'horizontal',
            placeholder: 'ör. "1-2 ay içinde", "Mümkün olan en kısa sürede"'
        },
        {
            id: 'notes',
            text: 'İç mimarımıza iletmek istediğiniz başka bir notunuz var mı?',
            type: 'textarea',
            required: true,
            layout: 'horizontal',
            placeholder: 'Eklemek istediğiniz diğer detaylar...'
        }
    ];
    
    const FileUpload = ({ question, value, onChange }) => {
        const handleFileChange = (e) => {
            const files = Array.from(e.target.files);
            onChange(question.id, question.multiple ? [...(value || []), ...files] : [files[0]]);
        };
        const handleDragOver = (e) => e.preventDefault();
        const handleDrop = (e) => {
            e.preventDefault();
            const files = Array.from(e.dataTransfer.files);
            onChange(question.id, question.multiple ? [...(value || []), ...files] : [files[0]]);
        };
        const removeFile = (fileToRemove) => {
            onChange(question.id, value.filter(file => file !== fileToRemove));
        };
        const inputId = `file-input-${question.id}`;

        return createElement("div", { className: "file-upload-wrapper" },
            createElement("label", {
                htmlFor: inputId,
                className: "file-upload-container",
                onDragOver: handleDragOver,
                onDrop: handleDrop
            },
            createElement("div", { className: "file-upload-content" },
                createElement("svg", {
                    xmlns: "http://www.w3.org/2000/svg",
                    width: "32",
                    height: "32",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "1.5",
                    className: "upload-icon"
                }, 
                    createElement("path", { d: "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" }),
                    createElement("path", { d: "M12 12v9" }),
                    createElement("path", { d: "m16 16-4-4-4 4" })
                ),
                createElement("div", { className: "file-upload-texts" },
                    createElement("span", { className: "upload-text" }, "Dosyaları sürükleyip bırakın"),
                    createElement("span", { className: "upload-hint" }, "veya tıklayarak seçin. Maks: 128MB")
                ),
                createElement("span", { className: "file-upload-button" }, "FOTOĞRAF YÜKLE")
            ),
            createElement("input", {
                id: inputId,
                type: "file",
                multiple: question.multiple,
                accept: question.accept,
                onChange: handleFileChange,
                className: "file-input-hidden"
            })
            ),
            value && value.length > 0 && createElement("div", { className: "file-preview-list" },
                value.map((file, index) => createElement("div", { key: index, className: "file-preview-item" },
                    createElement("span", { className: "file-name" }, file.name),
                    createElement("button", { onClick: () => removeFile(file), className: "remove-file-btn", "aria-label": `Remove ${file.name}` }, "×")
                ))
            )
        );
    };
    
    const WelcomeScreen = ({
        onStart
    }) => createElement("div", {
        className: "survey-container animate-fade-in welcome-view"
    }, createElement("div", {
        className: "welcome-content"
    }, createElement("h2", {
        className: "welcome-title"
    }, "Tasarım Yolculuğunuz Başlıyor"), createElement("p", {
        className: "welcome-subtitle"
    }, "Stilinizi ve ihtiyaçlarınızı anlamamıza yardımcı olacak bu anketi doldurarak hayalinizdeki mekana bir adım daha yaklaşın."), createElement("button", {
        onClick: onStart,
        className: "start-button"
    }, "Ankete Başla")));

    const App = () => {
        const [answers, setAnswers] = useState(() => {
            const rootEl = document.getElementById('root');
            const email = rootEl ? rootEl.dataset.customerEmail : null;
            return email ? { email: email } : {};
        });
        const [currentStep, setCurrentStep] = useState(0);
        const [view, setView] = useState('welcome');
        const [isSubmitting, setIsSubmitting] = useState(false);
        const [submitError, setSubmitError] = useState(null);
        
        const currentQuestion = questions[currentStep];
        const totalQuestions = questions.length;

        const handleAnswerChange = useCallback((questionId, value) => {
            setAnswers(prev => ({ ...prev, [questionId]: value }));
        }, []);

        const handleRadioChange = useCallback((questionId, value) => {
            const updates = { [questionId]: value };
            if (value !== 'Diğer') {
                updates[`${questionId}_other`] = '';
            }
            setAnswers(prev => ({ ...prev, ...updates }));
        }, []);

        const handleCheckboxChange = useCallback((questionId, option) => {
            setAnswers(prev => {
                const currentOptionValues = prev[questionId] || {};
                const newOptionValues = { ...currentOptionValues, [option]: !currentOptionValues[option] };
                const updates = { [questionId]: newOptionValues };
                if (option === 'Diğer' && !newOptionValues[option]) {
                    updates[`${questionId}_other`] = '';
                }
                return { ...prev, ...updates };
            });
        }, []);

        const isNextDisabled = useMemo(() => {
            if (!currentQuestion || !currentQuestion.required) return false;
            const answer = answers[currentQuestion.id];

            if (currentQuestion.type === 'email') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return !(answer && emailRegex.test(answer));
            }
            if (currentQuestion.type === 'file') {
                return !answer || answer.length === 0;
            }
            if (currentQuestion.type === 'textarea' || currentQuestion.type === 'text') {
                return !answer || answer.trim() === '';
            }
            if (answer === undefined || answer === null || answer === '') return true;

            if (currentQuestion.type === 'checkbox') {
                if (!Object.values(answer).some(val => val === true)) return true;
                if (answer['Diğer'] && !(answers[`${currentQuestion.id}_other`] ?.trim())) {
                    return true;
                }
            }
            if (currentQuestion.type === 'radio' && currentQuestion.hasOtherSpecify) {
                if (answer === 'Diğer' && !(answers[`${currentQuestion.id}_other`] ?.trim())) {
                    return true;
                }
            }
            return false;
        }, [answers, currentQuestion]);

        const handleSubmit = async () => {
            setIsSubmitting(true);
            setSubmitError(null);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            let response;
            try {
                const API_ENDPOINT = '/api/send-email';
                const formData = new FormData();
                const submissionData = {};
                const userEmail = answers['email'] || 'E-posta Belirtilmedi';

                questions.forEach(q => {
                    const answer = answers[q.id];
                    let formattedAnswer = "Cevaplanmadı";

                    if (answer !== undefined && answer !== null && answer !== '') {
                        switch (q.type) {
                            case 'file':
                                if (Array.isArray(answer) && answer.length > 0) {
                                    formattedAnswer = `${answer.length} dosya yüklendi: ${answer.map(f => f.name).join(', ')}`;
                                    answer.forEach(file => formData.append(q.id, file, file.name));
                                } else {
                                    formattedAnswer = "Dosya yüklenmedi";
                                }
                                break;
                            case 'checkbox':
                                if (typeof answer === 'object' && Object.values(answer).some(v => v)) {
                                    const selectedOptions = Object.entries(answer)
                                        .filter(([, checked]) => checked)
                                        .map(([opt]) => opt);

                                    if (q.hasOtherSpecify && selectedOptions.includes('Diğer')) {
                                        const otherValue = answers[`${q.id}_other`];
                                        const otherIndex = selectedOptions.indexOf('Diğer');
                                        selectedOptions[otherIndex] = `Diğer (${otherValue || 'belirtilmedi'})`;
                                    }
                                    formattedAnswer = selectedOptions.join(', ');
                                }
                                break;
                            case 'radio':
                                if (q.hasOtherSpecify && answer === 'Diğer') {
                                    const otherValue = answers[`${q.id}_other`];
                                    formattedAnswer = `Diğer (${otherValue || 'belirtilmedi'})`;
                                } else {
                                    formattedAnswer = answer;
                                }
                                break;
                            default: // text, textarea, email
                                if (typeof answer === 'string' && answer.trim() !== '') {
                                    formattedAnswer = answer.trim();
                                }
                                break;
                        }
                    }
                    submissionData[q.text] = formattedAnswer;
                });

                formData.append('submission', JSON.stringify({
                    subject: `Yeni Tasarım Keşif Anketi: ${userEmail}`,
                    replyTo: userEmail,
                    answers: submissionData
                }));

                response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                console.groupCollapsed('--- Sunucu Yanıtı Alındı ---');
                console.log('Status:', response.status);
                console.log('OK:', response.ok);
                const responseForLog = response.clone();
                try {
                    const responseData = await responseForLog.json();
                    console.log('Response Data (JSON):', responseData);
                } catch (e) {
                    const responseText = await responseForLog.text();
                    console.log('Response Data (Text):', responseText);
                }
                console.groupEnd();

                if (response.ok) {
                    setView('submitted');
                } else {
                    const errorData = await response.json().catch(() => ({ error: `HTTP Hatası: ${response.status} - ${response.statusText}` }));
                    throw new Error(errorData.error || 'Bilinmeyen bir sunucu hatası oluştu.');
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    setSubmitError('Gönderim zaman aşımına uğradı. Lütfen tekrar deneyin.');
                } else {
                    setSubmitError(`Gönderim başarısız oldu: ${error.message}. Lütfen ağ bağlantınızı kontrol edin ve tekrar deneyin.`);
                }
                if (response) {
                    console.error("Hata oluştuğunda sunucu yanıtı:", { status: response.status, ok: response.ok });
                }
            } finally {
                clearTimeout(timeoutId);
                setIsSubmitting(false);
            }
        };

        const handleNext = async () => {
            if (currentStep < totalQuestions - 1) {
                setCurrentStep(prev => prev + 1);
            } else {
                await handleSubmit();
            }
        };
        const handlePrev = () => {
            if (currentStep > 0) {
                setCurrentStep(prev => prev - 1);
            }
        };
        const handleStart = () => setView('survey');

        const renderQuestion = () => {
            const { id, type, options, placeholder, hasOtherSpecify, grid } = currentQuestion;
            const value = answers[id];
            const containerClass = grid ? "options-grid" : "options-container";

            switch (type) {
                case 'text':
                case 'email':
                    return createElement("input", {
                        type: type === 'email' ? 'email' : 'text',
                        className: "text-input",
                        value: value || '',
                        onChange: (e) => handleAnswerChange(id, e.target.value),
                        placeholder: placeholder || (type === 'email' ? "example@example.com" : "Cevabınızı buraya yazın..."),
                        autoComplete: type === 'email' ? 'email' : 'off',
                    });
                case 'textarea':
                    return createElement("textarea", {
                        className: "text-input",
                        value: value || '',
                        onChange: (e) => handleAnswerChange(id, e.target.value),
                        placeholder: placeholder || "Cevabınızı buraya yazın..."
                    });
                case 'radio':
                    return createElement("div", { className: containerClass },
                        options.map(option => createElement("label", { key: option, className: "choice-label" },
                            createElement("input", { type: "radio", name: id, value: option, checked: value === option, onChange: (e) => (hasOtherSpecify ? handleRadioChange : handleAnswerChange)(id, e.target.value) }),
                            createElement("span", { className: "custom-control custom-radio" }),
                            createElement("span", { className: "choice-text" }, option)
                        )),
                        hasOtherSpecify && value === 'Diğer' && createElement("input", { type: "text", className: "text-input other-specify-input", placeholder: "Lütfen belirtin...", value: answers[`${id}_other`] || '', onChange: (e) => handleAnswerChange(`${id}_other`, e.target.value) })
                    );
                case 'checkbox':
                    return createElement("div", { className: containerClass },
                        options.map(option => createElement("label", { key: option, className: "choice-label" },
                            createElement("input", { type: "checkbox", name: option, checked: !!(value && value[option]), onChange: () => handleCheckboxChange(id, option) }),
                            createElement("span", { className: "custom-control custom-checkbox" }),
                            createElement("span", { className: "choice-text" }, option)
                        )),
                        hasOtherSpecify && value && value['Diğer'] && createElement("input", { type: "text", className: "text-input other-specify-input", placeholder: "Lütfen belirtin...", value: answers[`${id}_other`] || '', onChange: (e) => handleAnswerChange(`${id}_other`, e.target.value) })
                    );
                case 'file':
                     return createElement(FileUpload, { question: currentQuestion, value: value || [], onChange: handleAnswerChange });
                default:
                    return null;
            }
        };

        if (view === 'welcome') return createElement(WelcomeScreen, { onStart: handleStart });
        if (view === 'submitted') {
            return createElement("div", { className: "survey-container" },
                createElement("div", { className: "thank-you-container" },
                    createElement("h2", null, "Teşekkür ederiz!"),
                    createElement("p", null, "Tasarım yolculuğunuza bizimle başladığınız için heyecanlıyız. En kısa sürede sizinle iletişime geçeceğiz.")
                )
            );
        }

        const questionLayoutClass = `question-layout-${currentQuestion.layout || 'vertical'}`;
        return createElement("div", { className: "survey-container" },
            createElement("div", { className: "progress-container" },
                createElement("div", { className: "progress-info" }, `Adım ${currentStep + 1} / ${totalQuestions}`),
                createElement("div", { className: "progress-bar" },
                    createElement("div", { className: "progress-bar-fill", style: { width: `${((currentStep + 1) / totalQuestions) * 100}%` } })
                )
            ),
            createElement("div", { className: "question-body" },
                createElement("div", { className: questionLayoutClass },
                    createElement("p", { className: "question-text" },
                        currentQuestion.text,
                        currentQuestion.required && createElement("span", { className: "required-star" }, "*")
                    ),
                    createElement("div", { className: "question-content" }, renderQuestion())
                )
            ),
            createElement("div", { className: "navigation-buttons" },
                createElement("div", { className: "nav-button-container" },
                    createElement("button", { className: `nav-button nav-prev ${currentStep === 0 ? 'hidden' : ''}`, onClick: handlePrev, disabled: isSubmitting }, "GERİ"),
                    createElement("button", { className: "nav-button nav-next", onClick: handleNext, disabled: isNextDisabled || isSubmitting }, isSubmitting ? 'GÖNDERİLİYOR...' : (currentStep === totalQuestions - 1 ? 'GÖNDER' : 'İLERİ'))
                ),
                submitError && createElement("p", { className: "submit-error" }, submitError)
            )
        );
    };

    const container = document.getElementById('root');
    const root = createRoot(container);
    root.render(createElement(App));

  } catch (error) {
    console.error('Survey App Initialization Error:', error);
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.innerHTML = `<div style="padding: 2rem; text-align: center; color: #ef4444; font-family: sans-serif;">HATA: ${error.message} Anket yüklenirken kritik bir hata oluştu. Lütfen site yöneticisiyle iletişime geçin.</div>`;
    }
  }
});