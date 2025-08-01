import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Pressable } from 'react-native';

// 화면 높이를 가져와 모달 높이 계산에 사용
const screenHeight = Dimensions.get('window').height;

// 카테고리 데이터 정의
interface CategoryData {
  [key: string]: string[];
}

const categories: CategoryData = {
  digital: ["모바일/태블릿", "노트북", "PC/모니터", "카메라", "음향기기", "웨어러블 기기", "게임기", "드론", "기타 디지털"],
  living: ["대형가전", "주방가전", "생활가전", "계절가전", "공기청정/제습", "청소기", "세탁/건조기"],
  furniture: ["침대/매트리스", "소파/의자", "테이블/식탁", "수납장/선반", "조명", "인테리어 소품", "사무용 가구"],
  fashion: ["상의", "하의", "아우터", "원피스", "신발", "가방", "액세서리", "이너웨어"],
  beauty: ["스킨케어", "메이크업", "헤어케어", "바디케어", "향수", "네일", "남성 뷰티"],
  books: ["소설", "시/에세이", "인문학", "사회과학", "역사", "예술", "IT/컴퓨터", "만화", "잡지"],
  hobby: ["보드게임", "콘솔 게임", "PC 게임", "피규어/프라모델", "악기", "미술용품", "공예용품", "여행용품"],
  food: ["신선식품", "가공식품", "건강식품", "음료", "베이커리", "간편식", "주류"],
  sports: ["헬스/요가", "등산/캠핑", "골프", "자전거", "축구/야구", "수영", "스키/보드", "낚시"]
};

// 카테고리 탭의 표시 이름과 데이터 키 매핑
const categoryTabsMapping = [
  { name: "디지털 기기", key: "digital" },
  { name: "생활가전", key: "living" },
  { name: "가구/인테리어", key: "furniture" },
  { name: "패션의류", key: "fashion" },
  { name: "뷰티/미용", key: "beauty" },
  { name: "도서", key: "books" },
  { name: "취미/게임", key: "hobby" },
  { name: "식품", key: "food" },
  { name: "스포츠/레저", key: "sports" },
];

// CategoryPicker 컴포넌트의 props 타입 정의
interface CategoryPickerProps {
  visible: boolean; // 모달 열림/닫힘 상태
  onClose: () => void; // 모달 닫기 함수
  onSelectCategory: (category: string) => void; // 카테고리 선택 시 호출될 콜백 추가
}

// CategoryPicker 컴포넌트 정의
const CategoryPicker: React.FC<CategoryPickerProps> = ({ visible, onClose, onSelectCategory }) => {
  // 현재 활성화된 대분류 카테고리 키 관리 (초기값은 첫 번째 탭)
  const [activeCategory, setActiveCategory] = useState<string>(categoryTabsMapping[0].key);
  // 현재 표시될 소분류 목록 관리
  const [subcategories, setSubcategories] = useState<string[]>([]);
  // 모달 애니메이션을 위한 상태 (visible prop과 별개로 애니메이션 제어)
  const [modalTranslateY, setModalTranslateY] = useState(screenHeight * 0.7); // 모달 높이의 70%만큼 아래로 숨김

  // activeCategory 변경 시 소분류 목록 업데이트
  useEffect(() => {
    setSubcategories(categories[activeCategory] || []);
  }, [activeCategory]);

  // visible prop 변경에 따라 모달 애니메이션 제어
  useEffect(() => {
    if (visible) {
      setModalTranslateY(0); // 모달 보이기
    } else {
      setModalTranslateY(screenHeight * 0.7); // 모달 숨기기
    }
  }, [visible]);

  // 대분류 탭 클릭 핸들러
  const handleCategoryTabClick = (categoryKey: string) => {
    setActiveCategory(categoryKey);
  };

  // 소분류 항목 클릭 핸들러
  const handleSubcategoryClick = (subcategory: string) => {
    onSelectCategory(subcategory); // 선택된 소분류를 부모 컴포넌트로 전달
    onClose(); // 모달 닫기
  };

  if (!visible && modalTranslateY === screenHeight * 0.7) {
    // 모달이 완전히 숨겨져 있을 때는 렌더링하지 않아 성능 최적화
    return null;
  }

  return (
    // 카테고리 선택 모달 오버레이
    <Pressable
      style={[styles.modalOverlay, { opacity: visible ? 1 : 0 }]}
      onPress={onClose} // 오버레이 클릭 시 모달 닫기
      // visible이 false일 때 터치 이벤트를 막기 위해 pointerEvents 속성 사용
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Pressable
        style={[
          styles.modalPanel,
          { transform: [{ translateY: modalTranslateY }] },
        ]}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>카테고리</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>&times;</Text>
          </TouchableOpacity>
        </View>

        {/* 대분류 카테고리 탭 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryTabsScrollView} // 고정 높이 스타일 적용
          contentContainerStyle={styles.categoryTabsContainer}
        >
          {categoryTabsMapping.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => handleCategoryTabClick(tab.key)}
              style={[
                styles.categoryTab,
                activeCategory === tab.key ? styles.activeCategoryTab : {},
              ]}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  activeCategory === tab.key ? styles.activeCategoryTabText : {},
                ]}
              >
                {tab.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 소분류 카테고리 목록 */}
        <ScrollView style={styles.subcategoryListContainer}>
          {subcategories.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleSubcategoryClick(item)} // 소분류 클릭 시 콜백 호출
              style={styles.subcategoryItem}
            >
              <Text style={styles.subcategoryItemText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Pressable>
    </Pressable>
  );
};

// StyleSheet를 사용하여 스타일 정의 (Tailwind 클래스 변환)
const styles = StyleSheet.create({
  modalOverlay: {
    ...StyleSheet.absoluteFillObject, // fixed inset-0
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // bg-black bg-opacity-50
    justifyContent: 'flex-end', // items-end
    alignItems: 'center', // justify-center (가로 중앙 정렬)
    zIndex: 1000,
  },
  modalPanel: {
    backgroundColor: 'white', // bg-white
    width: '100%', // w-full
    maxWidth: 600, // max-w-md (대략적인 값)
    height: screenHeight * 0.7, // h-[70vh]
    flexDirection: 'column', // flex flex-col
    borderTopLeftRadius: 32, // rounded-t-3xl (2rem = 32px)
    borderTopRightRadius: 32, // rounded-t-3xl
    padding: 24, // p-6 (1.5rem = 24px)
    shadowColor: '#000', // shadow-xl
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10, // Android shadow
    position: 'absolute', // 애니메이션을 위해 absolute로 설정
    bottom: 0, // 아래에 붙도록
  },
  modalHeader: {
    flexDirection: 'row', // flex
    justifyContent: 'space-between', // justify-between
    alignItems: 'center', // items-center
    marginBottom: 16, // mb-4
  },
  modalTitle: {
    fontSize: 24, // text-2xl
    fontWeight: 'bold', // font-bold
    color: '#1f2937', // text-gray-800
  },
  closeButton: {
    padding: 8, // 여백 추가
  },
  closeButtonText: {
    fontSize: 30, // text-3xl
    fontWeight: '300', // font-light
    color: '#6b7280', // text-gray-500
  },
  categoryTabsScrollView: {
    height: 60, // 스크롤 뷰의 고정 높이
    flexGrow: 0,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryTabsContainer: {
    flexDirection: 'row', // flex
    alignItems: 'center', // 탭들을 수직 중앙 정렬
    gap: 8, // gap-2
    paddingBottom: 8, // pb-2
  },
  categoryTab: {
    paddingHorizontal: 16, // px-4
    paddingVertical: 8, // py-2
    borderRadius: 9999, // rounded-full
    backgroundColor: 'transparent', // 기본 배경
    justifyContent: 'center', // 텍스트 세로 중앙 정렬
    alignItems: 'center', // 텍스트 가로 중앙 정렬
  },
  activeCategoryTab: {
    backgroundColor: '#3b82f6', // bg-blue-500
  },
  categoryTabText: {
    fontSize: 14, // text-sm
    fontWeight: '500', // font-medium
    color: '#4b5563', // text-gray-600
  },
  activeCategoryTabText: {
    color: 'white', // text-white
  },
  subcategoryListContainer: {
    flexGrow: 1, // flex-grow
    // overflow-y-auto는 ScrollView 자체 속성으로 대체
  },
  subcategoryItem: {
    padding: 12, // p-3
    borderRadius: 8, // rounded-lg
    backgroundColor: 'white', // 기본 배경
    marginBottom: 8, // space-y-2 (list item 간 간격)
  },
  subcategoryItemText: {
    color: '#4b5563', // text-gray-700
    fontWeight: '500', // font-medium
  },
  bottomButtonsContainer: {
    flexDirection: 'row', // flex
    justifyContent: 'center', // justify-center
    marginTop: 16, // mt-4
    gap: 16, // space-x-4
  },
  selectButton: {
    backgroundColor: '#4f46e5', // bg-indigo-600
    paddingVertical: 10, // py-2
    paddingHorizontal: 20, // px-5
    borderRadius: 8, // rounded-lg
    shadowColor: '#000', // shadow-md
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5, // Android shadow
  },
  selectButtonText: {
    color: 'white', // text-white
    fontWeight: 'bold', // font-bold
    fontSize: 16, // 기본 글자 크기
  },
  resetButton: {
    backgroundColor: '#d1d5db', // bg-gray-300
    paddingVertical: 10, // py-2
    paddingHorizontal: 20, // px-5
    borderRadius: 8, // rounded-lg
    shadowColor: '#000', // shadow-md
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5, // Android shadow
  },
  resetButtonText: {
    color: '#374151', // text-gray-800
    fontWeight: 'bold', // font-bold
    fontSize: 16, // 기본 글자 크기
  },
});

// 메인 App 컴포넌트
const App: React.FC = () => {
  // 모달 표시 상태 관리
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  // 선택된 카테고리 상태 (테스트용)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // 카테고리 변경 핸들러 (예시)
  const handleChange = (type: string, value: string) => {
    if (type === 'category') {
      setSelectedCategory(value);
      console.log('선택된 카테고리:', value);
    }
  };

  return (
    <View style={stylesApp.container}>
      {/* 모달을 열기 위한 버튼 */}
      <TouchableOpacity
        onPress={() => setCategoryModalVisible(true)}
        style={stylesApp.openModalButton}
      >
        <Text style={stylesApp.openModalButtonText}>카테고리 선택 열기</Text>
      </TouchableOpacity>

      {selectedCategory && (
        <Text style={stylesApp.selectedCategoryText}>
          선택된 카테고리: {selectedCategory}
        </Text>
      )}

      {/* CategoryPicker 컴포넌트 사용 */}
      <CategoryPicker
        visible={isCategoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        onSelectCategory={(category) => handleChange('category', category)}
      />
    </View>
  );
};

// App 컴포넌트의 스타일
const stylesApp = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e5e7eb', // bg-gray-200
    alignItems: 'center', // items-center
    justifyContent: 'center', // justify-center
    padding: 16, // p-4
  },
  openModalButton: {
    backgroundColor: '#3b82f6', // bg-blue-500
    paddingVertical: 12, // py-3
    paddingHorizontal: 24, // px-6
    borderRadius: 8, // rounded-lg
    shadowColor: '#000', // shadow-md
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5, // Android shadow
  },
  openModalButtonText: {
    color: 'white', // text-white
    fontWeight: 'bold', // font-bold
    fontSize: 16, // 기본 글자 크기
  },
  selectedCategoryText: {
    marginTop: 16, // mt-4
    fontSize: 18, // text-lg
    fontWeight: '600', // font-semibold
    color: '#4b5563', // text-gray-700
  },
});

export default CategoryPicker;
