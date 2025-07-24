
import React, { useState, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

interface Question {
  id: string;
  text: string;
  type: string;
  required: boolean;
  layout: string;
  multiple?: boolean;
  accept?: string;
  options?: string[];
  hasOtherSpecify?: boolean;
  placeholder?: string;
}

const questions: Question[] = [
  { id: 'email', text: 'Email', type: 'email', required: true, layout: 'horizontal' },
  { id: 'space_photos', text: 'Mekanın farklı köşelerden çekilmiş fotoğraflarını yükler misin?', type: 'file', required: true, multiple: true, accept: 'image/*', layout: 'horizontal' },
  { id: 'floor_plan', text: 'Mekanın ölçülü planını bizimle paylaşır mısın?', type: 'file', required: true, multiple: false, accept: 'image/*,application/pdf,.dwg,.dxf', layout: 'horizontal' },
  { id: 'inspiration_photos', text: 'Beğendiğin iç mekan örnekleri var mı?', type: 'file', required: true, multiple: true, accept: 'image/*', layout: 'horizontal' },
  { id: 'atmosphere', text: 'Mekanında nasıl bir atmosfer hayal ediyorsun?', type: 'textarea', required: true, layout: 'horizontal' },
  { id: 'users', text: 'Bu mekanı kimler kullanacak?', type: 'textarea', required: true, layout: 'horizontal' },
  { id: 'functions', text: 'Seçtiğin mekan için eklemek istediğin işlev var mı?', type: 'checkbox', options: ['Dinlenme ve Uyuma', 'Oturma ve Misafir Ağırlama', 'Çalışma Alanı', 'Hobi alanı', 'Diğer'], required: false, hasOtherSpecify: true, layout: 'horizontal' },
  { id: 'usage_times', text: 'Günün hangi saatlerinde bu alanı aktif olarak kullanıyorsun?', type: 'checkbox', options: ['Sabah', 'Öğle', 'Akşam', 'Gece'], required: false, layout: 'vertical' },
  { id: 'problems_to_solve', text: 'Yaşam alanında çözmemizi istediğin bir konu var mı?', type: 'textarea', required: false, layout: 'vertical' },
  { id: 'residents', text: 'Evde çocuk ya da evcil hayvan var mı?', type: 'radio', options: ['Sadece çocuk var', 'Sadece evcil hayvan var', 'Her ikisi de var', 'Her ikisi de yok'], required: false, layout: 'vertical' },
  { id: 'expectations', text: 'Tasarlanmasını istediğin mekanda en temel beklentin nedir?', type: 'textarea', required: false, layout: 'vertical' },
  { id: 'style', text: 'Sence seni en iyi yansıtan dekorasyon tarzı hangisi?', type: 'radio', options: ['Modern', 'Bohem', 'İskandinav', 'Klasik', 'Diğer'], required: false, hasOtherSpecify: true, layout: 'vertical' },
  { id: 'colors', text: 'Mekan içerisinde hangi renkleri/tonları ön planda görmek istersin?', type: 'checkbox', options: ['Beyaz ve açık nötr tonlar', 'Gri Tonları', 'Krem/Bej Tonları', 'Toprak Tonları (kahve, kum vs.)', 'Pastel Tonlar(pudra, mint vs.)', 'Canlı Renkler(sarı, turuncu vs.)', 'Koyu Tonlar (siyah, antrasit vs.)', 'Diğer'], required: false, hasOtherSpecify: true, layout: 'vertical' },
  { id: 'materials', text: 'Hangi malzeme tarzı sana daha yakın?', type: 'radio', options: ['Doğal Malzemeler (ahşap, taş, keten vs.)', 'Modern Malzeme ( cam, metal, kaplama yüzeyler vs.)', 'İkisinin dengesi olsun isterim'], required: false, layout: 'vertical' },
  { id: 'fabric_sensitivity', text: 'Kumaş seçiminde özel bir isteğin ya da hassasiyetin var mı?', type: 'textarea', required: true, layout: 'horizontal' },
  { id: 'budget', text: 'Proje için düşündüğün yaklaşık bütçeyi paylaşır mısın?', type: 'checkbox', options: ['70.000 TL - 90.000 TL', '90.000 TL - 110.000 TL', '110.000 TL - 130.000 TL', '130.000 TL - 150.000 TL'], required: false, layout: 'horizontal' },
  { id: 'priority', text: 'Mekan içerisinde senin için en öncelikli olan ne?', type: 'radio', options: ['Görsellik', 'İşlevsellik', 'Konfor'], required: false, layout: 'horizontal' },
  { id: 'notes', text: 'İç mimarımıza iletmek istediğin bir notun var mı?', type: 'textarea', required: true, layout: 'horizontal' },
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

  return (
    <div className="file-upload-wrapper">
      <label 
        htmlFor={inputId} 
        className="file-upload-container" 
        onDragOver={handleDragOver} 
        onDrop={handleDrop}
      >
        <div className="file-upload-content">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="upload-icon"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          <span className="upload-text">Dosya Yükle</span>
          <span className="upload-hint">Drag and drop files here</span>
        </div>
        <input 
          id={inputId}
          type="file" 
          multiple={question.multiple} 
          accept={question.accept}
          onChange={handleFileChange}
          className="file-input-hidden"
        />
      </label>
      {value && value.length > 0 && (
        <div className="file-preview-list">
          {value.map((file, index) => (
            <div key={index} className="file-preview-item">
              <span className="file-name">{file.name}</span>
              <button onClick={() => removeFile(file)} className="remove-file-btn" aria-label={`Remove ${file.name}`}>&times;</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const WelcomeScreen = ({ onStart }) => (
    <div className="survey-container animate-fade-in">
      <div className="survey-header">
        <h1>Tasarım Keşif Anketi</h1>
      </div>
      <div className="welcome-content">
        <h2 className="welcome-title">Tasarım Yolculuğunuz Başlıyor</h2>
        <p className="welcome-subtitle">
          Stilinizi ve ihtiyaçlarınızı anlamamıza yardımcı olacak bu anketi doldurarak hayalinizdeki mekana bir adım daha yaklaşın.
        </p>
        <button onClick={onStart} className="start-button">
          Ankete Başla
        </button>
      </div>
    </div>
  );


const App = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [view, setView] = useState('welcome'); // 'welcome', 'survey', 'submitted'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentQuestion = questions[currentStep];
  const totalQuestions = questions.length;

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };
  
  const handleRadioChange = (questionId, value) => {
    const updates = { [questionId]: value };
    if (value !== 'Diğer') {
      updates[`${questionId}_other`] = '';
    }
    setAnswers(prev => ({ ...prev, ...updates }));
  };

  const handleCheckboxChange = (questionId, option) => {
    const currentOptionValues = answers[questionId] || {};
    const newOptionValues = { ...currentOptionValues, [option]: !currentOptionValues[option] };

    const updates = { [questionId]: newOptionValues };
    if (option === 'Diğer' && !newOptionValues[option]) {
        updates[`${questionId}_other`] = '';
    }
    setAnswers(prev => ({ ...prev, ...updates }));
  };

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

    if (currentQuestion.type === 'textarea') {
      return !answer || answer.trim() === '';
    }
    
    if (answer === undefined || answer === null || answer === '') return true;
    
    if (currentQuestion.type === 'checkbox') {
      if (!Object.values(answer).some(val => val === true)) return true;
      if (answer['Diğer'] && !(answers[`${currentQuestion.id}_other`]?.trim())) {
        return true;
      }
    }

    if (currentQuestion.type === 'radio' && currentQuestion.hasOtherSpecify) {
      if (answer === 'Diğer' && !(answers[`${currentQuestion.id}_other`]?.trim())) {
        return true;
      }
    }

    return false;
  }, [answers, currentQuestion]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    // This is the new backend endpoint.
    // It should be handled by a serverless function or a small backend server.
    const API_ENDPOINT = '/api/send-email';

    const formData = new FormData();
    
    // 1. Prepare structured data for all answers
    const submissionData: { [key: string]: any } = {};
    const userEmail = answers['email'] || 'E-posta belirtilmedi';

    questions.forEach(q => {
        const answer = answers[q.id];

        if (q.type === 'file') {
            // Files are appended to FormData separately. We can add a note here.
            submissionData[q.text] = (answer && answer.length > 0) 
                ? `${answer.length} dosya eklendi (e-postaya eklenmiştir).` 
                : "Dosya yüklenmedi.";
            return;
        }
        
        if (answer === undefined || answer === null || (typeof answer === 'string' && answer.trim() === '')) {
            submissionData[q.text] = "Cevaplanmadı";
            return;
        }

        switch (q.type) {
            case 'checkbox': {
                const selectedOptions = Object.keys(answer).filter(key => answer[key]);
                let checkboxAnswer = "Seçim yapılmadı.";
                if (selectedOptions.length > 0) {
                   checkboxAnswer = selectedOptions.join(', ');
                    if (selectedOptions.includes('Diğer') && answers[`${q.id}_other`]) {
                        checkboxAnswer += ` (Diğer: ${answers[`${q.id}_other`]})`;
                    }
                }
                submissionData[q.text] = checkboxAnswer;
                break;
            }
            case 'radio': {
                let radioAnswer = answer;
                if (answer === 'Diğer' && answers[`${q.id}_other`]) {
                    radioAnswer += ` (Diğer: ${answers[`${q.id}_other`]})`;
                }
                submissionData[q.text] = radioAnswer;
                break;
            }
            default: // email, textarea
                submissionData[q.text] = answer;
                break;
        }
    });

    // 2. Append structured data and files to FormData
    // The backend will receive a 'submission' field with JSON, and separate fields for files.
    formData.append('submission', JSON.stringify({
        subject: `Yeni Tasarım Keşif Anketi: ${userEmail}`,
        replyTo: userEmail,
        answers: submissionData
    }));

    questions.forEach(q => {
        if (q.type === 'file' && answers[q.id]) {
            answers[q.id].forEach((file: File) => {
                // The backend can use q.id as the field name to identify file groups
                formData.append(q.id, file, file.name);
            });
        }
    });

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            body: formData,
            // 'Content-Type' is not needed; the browser sets it for multipart/form-data
        });

        if (response.ok) {
            setView('submitted');
        } else {
            let errorData;
            try {
                errorData = await response.json();
            } catch (jsonError) {
                throw new Error(`HTTP Hata Kodu: ${response.status} - ${response.statusText || 'Bilinmeyen bir sunucu hatası.'}`);
            }
            const errorMessage = errorData?.error || 'Bilinmeyen bir hata oluştu. Lütfen tekrar deneyin.';
            throw new Error(errorMessage);
        }
    } catch (error) {
        setSubmitError(`Gönderim başarısız oldu: ${error.message}. Lütfen ağ bağlantınızı kontrol edin ve tekrar deneyin. Sorun devam ederse, site yöneticisiyle iletişime geçin.`);
    } finally {
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

  const handleStart = () => {
    setView('survey');
  }

  const renderQuestion = () => {
    const { id, type, options, placeholder } = currentQuestion;
    const value = answers[id];

    const optionsContainerClass = options?.length > 4 ? 'options-grid' : 'options-container';

    switch (type) {
      case 'email':
        return <input type="email" className="text-input" value={value || ''} onChange={(e) => handleAnswerChange(id, e.target.value)} placeholder="example@example.com" />;
      case 'file':
        return <FileUpload question={currentQuestion} value={value} onChange={handleAnswerChange} />;
      case 'radio':
        return <>
          <div className={optionsContainerClass}>{options.map(opt => (
            <label key={opt} className="choice-label">
              <input type="radio" name={id} value={opt} checked={value === opt} onChange={(e) => handleRadioChange(id, e.target.value)} />
              <span className="custom-control custom-radio"></span>
              <span className="choice-text">{opt}</span>
            </label>
          ))}</div>
          {currentQuestion.hasOtherSpecify && value === 'Diğer' && (
            <input
              type="text"
              className="text-input other-specify-input"
              placeholder="Lütfen belirtin..."
              value={answers[`${id}_other`] || ''}
              onChange={(e) => handleAnswerChange(`${id}_other`, e.target.value)}
              aria-label="Diğer seçeneğini belirtin"
              autoFocus
            />
          )}
        </>;
      case 'checkbox':
        return <>
            <div className={optionsContainerClass}>{options.map(opt => (
              <label key={opt} className="choice-label">
                <input type="checkbox" name={id} value={opt} checked={!!(value && value[opt])} onChange={() => handleCheckboxChange(id, opt)} />
                <span className="custom-control custom-checkbox"></span>
                <span className="choice-text">{opt}</span>
              </label>
            ))}</div>
            {currentQuestion.hasOtherSpecify && value && value['Diğer'] && (
              <input
                  type="text"
                  className="text-input other-specify-input"
                  placeholder="Lütfen belirtin..."
                  value={answers[`${id}_other`] || ''}
                  onChange={(e) => handleAnswerChange(`${id}_other`, e.target.value)}
                  aria-label="Diğer seçeneğini belirtin"
                  autoFocus
              />
            )}
        </>;
      case 'textarea':
        return <textarea className="text-input" value={value || ''} onChange={(e) => handleAnswerChange(id, e.target.value)} placeholder={placeholder || "Cevabınızı buraya yazın..."} />;
      default:
        return null;
    }
  };

  if (view === 'welcome') {
    return <WelcomeScreen onStart={handleStart} />;
  }

  if (view === 'submitted') {
    return (
      <div className="survey-container">
        <div className="thank-you-container">
          <h2>Teşekkür ederiz!</h2>
          <p>Tasarım yolculuğunuza bizimle başladığınız için heyecanlıyız. En kısa sürede sizinle iletişime geçeceğiz.</p>
        </div>
      </div>
    );
  }
  
  const questionLayoutClass = `question-layout-${currentQuestion.layout || 'vertical'}`;

  return (
    <div className="survey-container">
      <div className="survey-header">
        <h1>Tasarım Keşif Anketi</h1>
      </div>
      <div className="progress-container">
        <div className="progress-info">
          <span>Adım {currentStep + 1} / {totalQuestions}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${((currentStep + 1) / totalQuestions) * 100}%` }}></div>
        </div>
      </div>
      <div className="question-body">
         <div className={questionLayoutClass}>
            <p className="question-text">
              {currentQuestion.text}
              {currentQuestion.required && <span className="required-star">*</span>}
            </p>
            <div className="question-content">
              {renderQuestion()}
            </div>
         </div>
      </div>
      <div className="navigation-buttons">
        <div className="nav-button-container">
            <button className={`nav-button ${currentStep === 0 ? 'hidden' : ''}`} onClick={handlePrev} disabled={isSubmitting}>
              Geri
            </button>
            <button className="nav-button primary" onClick={handleNext} disabled={isNextDisabled || isSubmitting}>
              {isSubmitting ? 'Gönderiliyor...' : (currentStep === totalQuestions - 1 ? 'Gönder' : 'İleri')}
            </button>
        </div>
        {submitError && <p className="submit-error">{submitError}</p>}
      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
