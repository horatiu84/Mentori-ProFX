import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useLanguage } from "../../contexts/LanguageContext";

import aprilie1 from "../../utils/Aprilie 1.jpg";
import aprilie2 from "../../utils/Aprilie 2.jpg";
import aprilie3 from "../../utils/Aprilie 3.jpg";
import mai1 from "../../utils/Mai 1.jpg";
import mai2 from "../../utils/Mai 2.jpg";
import iunie1 from "../../utils/Iunie 1.jpg";
import iunie2 from "../../utils/Iunie 2.jpg";
import iunie3 from "../../utils/Iunie 3.jpg";
import iulie1 from "../../utils/Iulie 1.jpg";
import iulie2 from "../../utils/Iulie 2.jpg";
import iulie3 from "../../utils/Iulie 3.jpg";
import august1 from "../../utils/August 1.jpg";
import august2 from "../../utils/August 2.jpg";
import august3 from "../../utils/August 3.jpg";
import august4 from "../../utils/August 4.jpg";
import august5 from "../../utils/August 5.jpg";
import septembrie1 from "../../utils/Septembrie1.jpg";
import septembrie2 from "../../utils/Septembrie2.jpg";
import septembrie3 from "../../utils/Septembrie3.jpg";
import septembrie4 from "../../utils/Septembrie4.jpg";
import septembrie5 from "../../utils/Septembrie5.jpg";
import octombrie1 from "../../utils/Octombrie 1.jpg";
import octombrie2 from "../../utils/Octombrie 2.jpg";
import octombrie3 from "../../utils/Octombrie 3.jpg";
import octombrie4 from "../../utils/Octombrie 4.jpg";
import octombrie5 from "../../utils/Octombrie 5.jpg";
import noiembrie1 from "../../utils/Noiembrie 1.jpg";
import noiembrie2 from "../../utils/Noiembrie 2.jpg";
import noiembrie3 from "../../utils/Noiembrie 3.jpg";
import noiembrie4 from "../../utils/Noiembrie 4.jpg";
import noiembrie5 from "../../utils/Noiembrie 5.jpg";

const hallOfFame = [
  { img: aprilie1, name: "Ciprian Penisoara", place: 1, month: "Aprilie", year: 2025 },
  { img: aprilie2, name: "Florin Juravle", place: 2, month: "Aprilie", year: 2025 },
  { img: aprilie3, name: "Marian Tanase", place: 3, month: "Aprilie", year: 2025 },
  { img: mai1, name: "Florin Juravle", place: 1, month: "Mai", year: 2025 },
  { img: mai2, name: "Erik Cirstea", place: 2, month: "Mai", year: 2025 },
  { img: iunie1, name: "Paul Mendosa", place: 1, month: "Iunie", year: 2025 },
  { img: iunie2, name: "Erik Cirstea", place: 2, month: "Iunie", year: 2025 },
  { img: iunie3, name: "Mihai Vlada", place: 3, month: "Iunie", year: 2025 },
  { img: iulie1, name: "Romeo Bradeanu", place: 1, month: "Iulie", year: 2025 },
  { img: iulie2, name: "Mihai Vlada", place: 2, month: "Iulie", year: 2025 },
  { img: iulie3, name: "Lucian Solomonean", place: 3, month: "Iulie", year: 2025 },
  { img: august1, name: "Lavinia Sabau", place: 1, month: "August", year: 2025 },
  { img: august2, name: "Marian Tanase", place: 2, month: "August", year: 2025 },
  { img: august3, name: "Erik Cirstea", place: 3, month: "August", year: 2025 },
  { img: august4, name: "Romeo Bradeanu", place: 4, month: "August", year: 2025 },
  { img: august5, name: "Adela Mercea", place: 5, month: "August", year: 2025 },
  { img: septembrie1, name: "Horatiu Evu", place: 1, month: "Septembrie", year: 2025 },
  { img: septembrie2, name: "Gabriel Suciu", place: 2, month: "Septembrie", year: 2025 },
  { img: septembrie3, name: "Gabriel Muresan", place: 3, month: "Septembrie", year: 2025 },
  { img: septembrie4, name: "Erik Cirstea", place: 4, month: "Septembrie", year: 2025 },
  { img: septembrie5, name: "Adela Mercea", place: 5, month: "Septembrie", year: 2025 },
  { img: octombrie1, name: "Mihai Ilie", place: 1, month: "Octombrie", year: 2025 },
  { img: octombrie2, name: "Adela Mercea", place: 2, month: "Octombrie", year: 2025 },
  { img: octombrie3, name: "Adrian Crainic", place: 3, month: "Octombrie", year: 2025 },
  { img: octombrie4, name: "Marius Sebastian Gheorghita", place: 4, month: "Octombrie", year: 2025 },
  { img: octombrie5, name: "Marian Musoiu", place: 5, month: "Octombrie", year: 2025 },
  { img: noiembrie1, name: "Dan Floroiu", place: 1, month: "Noiembrie", year: 2025 },
  { img: noiembrie2, name: "Paul Madosa", place: 2, month: "Noiembrie", year: 2025 },
  { img: noiembrie3, name: "Erik Cirstea", place: 3, month: "Noiembrie", year: 2025 },
  { img: noiembrie4, name: "Lavinia Sabau", place: 4, month: "Noiembrie", year: 2025 },
  { img: noiembrie5, name: "Mocanu Adrian Ionel", place: 5, month: "Noiembrie", year: 2025 },
];

const HallOfFameCarousel = () => {
  const { language, translations } = useLanguage();
  const t = translations.carusel;
  
  const [modalImg, setModalImg] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("Toate");
  const [searchTerm, setSearchTerm] = useState("");

  // Mapping pentru traduceri luni
  const monthTranslations = {
    "Aprilie": t.aprilie,
    "Mai": t.mai,
    "Iunie": t.iunie,
    "Iulie": t.iulie,
    "August": t.august,
    "Septembrie": t.septembrie,
    "Octombrie": t.octombrie,
    "Noiembrie": t.noiembrie,
    "Decembrie": t.decembrie,
    "Ianuarie": t.ianuarie,
    "Februarie": t.februarie,
    "Martie": t.martie,
  };

  // Mapping pentru traduceri poziții
  const placeTranslations = {
    1: t.place1,
    2: t.place2,
    3: t.place3,
    4: t.place4,
    5: t.place5,
  };

  // Funcție pentru a genera titlul tradus
  const getTranslatedTitle = (item) => {
    const placeText = placeTranslations[item.place] || `${item.place}`;
    const monthText = monthTranslations[item.month] || item.month;
    return `${placeText} ${monthText} ${item.year}`;
  };

  // Extrage lunile unice din array (în română din data)
  const uniqueMonthsRo = [...new Set(hallOfFame.map(item => item.month))];
  
  // Construiește array de luni traduse pentru butoane
  const months = [t.allMonths, ...uniqueMonthsRo.map(monthRo => monthTranslations[monthRo] || monthRo)];

  // Filtrare diplome
  const filteredDiplomas = hallOfFame.filter(item => {
    const translatedMonth = monthTranslations[item.month] || item.month;
    const matchesMonth = selectedMonth === t.allMonths || translatedMonth === selectedMonth;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesMonth && matchesSearch;
  });

  // Blochează scroll-ul pe body când modalul e deschis
  useEffect(() => {
    if (modalImg) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [modalImg]);

  // Închidere cu ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setModalImg(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Reset selectedMonth la schimbarea limbii
  useEffect(() => {
    setSelectedMonth(t.allMonths);
  }, [language, t.allMonths]);

  return (
    <div key={language} className="w-full max-w-7xl mx-auto px-4 py-8 animate-language-change">
      <h2 className="text-3xl sm:text-5xl font-extrabold text-yellow-600 font-[Montserrat] mb-8 tracking-wider text-center drop-shadow">
        {t.pageTitle}
      </h2>

      {/* Filtre și Search */}
      <div className="mb-8 space-y-4">
        {/* Search Box */}
        <div className="flex justify-center">
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-600/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 hover:bg-gray-700/50 transition-all duration-300 backdrop-blur-sm"
          />
        </div>

        {/* Filtre Luni */}
        <div className="flex flex-wrap justify-center gap-2">
          {months.map((month) => (
            <button
              key={month}
              onClick={() => setSelectedMonth(month)}
              className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm ${
                selectedMonth === month
                  ? "bg-yellow-600/80 text-white shadow-lg scale-105 border border-yellow-400/50"
                  : "bg-gray-700/80 text-gray-300 hover:bg-gray-600/80 hover:text-yellow-400 hover:border-yellow-400/30 border border-gray-600/50"
              }`}
            >
              {month}
            </button>
          ))}
        </div>

        {/* Contor rezultate */}
        <div className="text-center text-gray-300">
          {filteredDiplomas.length} {filteredDiplomas.length === 1 ? t.diplomaSingular : t.diplomaPlural} {t.found}
        </div>
      </div>

      {/* Grid cu Diplome */}
      <motion.div
        layout
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
      >
        <AnimatePresence>
          {filteredDiplomas.map((item, idx) => (
            <motion.div
              key={`${item.month}-${idx}`}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className="group relative flex flex-col items-center justify-center p-3 cursor-pointer text-center bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl hover:border-yellow-400/30 hover:scale-105 transition-all duration-300 overflow-hidden"
              onClick={() => setModalImg(item.img)}
            >
              {/* Background gradient effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10 w-full">
                <img
                  src={item.img}
                  alt={item.name}
                  className="rounded-xl shadow-md w-full aspect-square object-cover"
                />
                <div className="mt-3 font-bold text-sm text-gray-200 group-hover:text-yellow-400 transition-colors duration-300">{item.name}</div>
                <div className="text-yellow-500 text-xs mt-1">{getTranslatedTitle(item)}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Mesaj când nu sunt rezultate */}
      {filteredDiplomas.length === 0 && (
        <div className="text-center py-12">
          <p className="text-xl text-gray-400">
            {t.noResults}
          </p>
        </div>
      )}

      {/* Motto final */}
      <div className="mt-12 mb-8 group relative bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 hover:border-yellow-400/30 transition-all duration-500 overflow-hidden">
        {/* Background gradient effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative z-10 text-center space-y-4">
          <h3 className="text-2xl sm:text-3xl font-bold text-yellow-400 group-hover:text-yellow-300 transition-colors duration-300">
            {t.mottoTitle}
          </h3>
          <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            {t.mottoDescription}
          </p>
          <div className="pt-2">
            <span className="text-4xl">🏆</span>
          </div>
        </div>
      </div>

      {/* Modal pentru imagine mărită */}
      {createPortal(
        <AnimatePresence>
          {modalImg && (
            <motion.div
              className="fixed inset-0 z-[9999] bg-black/75 flex items-center justify-center p-4"
              onClick={() => setModalImg(null)}
              aria-modal="true"
              role="dialog"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.img
                src={modalImg}
                alt={t.expandedAlt}
                className="max-w-[92vw] max-h-[85vh] rounded-2xl border-4 border-yellow-400 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.25 }}
              />

              {/* buton închidere */}
              <button
                onClick={() => setModalImg(null)}
                className="absolute top-4 right-4 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold shadow hover:bg-white transition-colors"
                aria-label={t.closeButton}
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default HallOfFameCarousel;
