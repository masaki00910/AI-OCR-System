"""
手書き文字認識を行うクラス
画像から数字を認識し、結果を返す
"""

import cv2
import numpy as np
import joblib
from typing import List, Dict, Tuple
import os
from scipy import ndimage

class HandwritingRecognizer:
    """手書き文字認識クラス"""
    
    def __init__(self, model_path: str = 'models/digit_recognition_model.pkl',
                 scaler_path: str = 'models/scaler.pkl'):
        """
        Args:
            model_path: 学習済みモデルのパス
            scaler_path: スケーラーのパス
        """
        # モデルとスケーラーの読み込み
        if not os.path.exists(model_path) or not os.path.exists(scaler_path):
            raise FileNotFoundError(
                "Model files not found. Please run train_model.py first."
            )
        
        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)
    
    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """画像の前処理
        
        Args:
            image: 入力画像（カラーまたはグレースケール）
            
        Returns:
            前処理済みの画像
        """
        # グレースケールに変換
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()
        
        # 二値化
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        return binary
    
    def extract_digits(self, binary_image: np.ndarray) -> List[Tuple[np.ndarray, Tuple[int, int, int, int]]]:
        """画像から個々の数字領域を抽出
        
        Args:
            binary_image: 二値化された画像
            
        Returns:
            (数字画像, (x, y, w, h)) のリスト
        """
        # 輪郭検出
        contours, _ = cv2.findContours(
            binary_image, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        
        # 面積でフィルタリング
        digit_regions = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area > 100:  # 小さすぎるノイズを除外
                x, y, w, h = cv2.boundingRect(contour)
                digit_img = binary_image[y:y+h, x:x+w]
                digit_regions.append((digit_img, (x, y, w, h)))
        
        # 左から右へソート
        digit_regions.sort(key=lambda x: x[1][0])
        
        return digit_regions
    
    def resize_to_8x8(self, image: np.ndarray) -> np.ndarray:
        """画像を8x8にリサイズ（scikit-learnのdigitsデータセットと同じ形式）
        
        Args:
            image: 入力画像
            
        Returns:
            8x8にリサイズされた画像
        """
        # アスペクト比を保持しながらリサイズ
        h, w = image.shape
        if h > w:
            new_h = 8
            new_w = int(w * 8 / h)
            if new_w == 0:
                new_w = 1
        else:
            new_w = 8
            new_h = int(h * 8 / w)
            if new_h == 0:
                new_h = 1
        
        resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
        
        # 8x8の中央に配置
        result = np.zeros((8, 8), dtype=np.uint8)
        y_offset = (8 - new_h) // 2
        x_offset = (8 - new_w) // 2
        result[y_offset:y_offset+new_h, x_offset:x_offset+new_w] = resized
        
        # 0-16の範囲に正規化（scikit-learnのdigitsデータセットと同じ）
        result = (result / 255.0) * 16
        
        return result
    
    def predict_digit(self, digit_image: np.ndarray) -> Tuple[int, float]:
        """単一の数字を予測
        
        Args:
            digit_image: 数字画像
            
        Returns:
            (予測された数字, 信頼度)
        """
        # 8x8にリサイズ
        resized = self.resize_to_8x8(digit_image)
        
        # 1次元配列に変換
        features = resized.reshape(1, -1)
        
        # スケーリング
        features_scaled = self.scaler.transform(features)
        
        # 予測
        prediction = self.model.predict(features_scaled)[0]
        
        # 信頼度の計算（SVMの場合は決定関数の値を使用）
        decision_values = self.model.decision_function(features_scaled)[0]
        confidence = float(np.max(decision_values))
        
        return int(prediction), confidence
    
    def recognize(self, image: np.ndarray) -> Dict:
        """画像から手書き数字を認識
        
        Args:
            image: 入力画像
            
        Returns:
            認識結果の辞書
            {
                'text': '認識された数字列',
                'confidence': 平均信頼度,
                'digits': [各数字の詳細情報],
                'boxes': [各数字のバウンディングボックス]
            }
        """
        # 前処理
        binary = self.preprocess_image(image)
        
        # 数字領域の抽出
        digit_regions = self.extract_digits(binary)
        
        if not digit_regions:
            return {
                'text': '',
                'confidence': 0.0,
                'digits': [],
                'boxes': []
            }
        
        # 各数字を認識
        results = []
        boxes = []
        confidences = []
        
        for digit_img, bbox in digit_regions:
            prediction, confidence = self.predict_digit(digit_img)
            results.append({
                'digit': str(prediction),
                'confidence': confidence,
                'bbox': bbox
            })
            boxes.append({
                'x': int(bbox[0]),
                'y': int(bbox[1]),
                'width': int(bbox[2]),
                'height': int(bbox[3])
            })
            confidences.append(confidence)
        
        # 結果をまとめる
        text = ''.join([r['digit'] for r in results])
        avg_confidence = np.mean(confidences) if confidences else 0.0
        
        return {
            'text': text,
            'confidence': float(avg_confidence),
            'digits': results,
            'boxes': boxes
        }