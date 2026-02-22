import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
import os

# --- 1. CONFIGURATION ---
# Based on your screenshot, this is the folder containing the sub-folders
DATASET_DIR = "dataset/Tomato_Bacterial_Spot" 

IMG_SIZE = (224, 224)
BATCH_SIZE = 32  # Increased for speed (since you have many images)
EPOCHS = 10      # 10 Epochs is enough for Transfer Learning

# Check if path exists
if not os.path.exists(DATASET_DIR):
    print(f"❌ Error: Folder '{DATASET_DIR}' not found!")
    print("Make sure your terminal is inside 'backend/' folder.")
    exit()

# --- 2. DATA GENERATORS (The Automatic Splitter) ---
print("📊 Loading Images & Splitting (80% Train / 20% Val)...")

# This object handles the splitting
datagen = ImageDataGenerator(
    rescale=1./255,         # Normalize pixel values
    rotation_range=20,      # Augmentation: Rotate images slightly
    zoom_range=0.2,         # Augmentation: Zoom in/out
    horizontal_flip=True,   # Augmentation: Flip L/R
    validation_split=0.2    # 👈 THIS DOES THE MAGIC SPLIT
)

# Training Data (80%)
train_generator = datagen.flow_from_directory(
    DATASET_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='training',      # Select training subset
    shuffle=True
)

# Validation Data (20%)
validation_generator = datagen.flow_from_directory(
    DATASET_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='validation',    # Select validation subset
    shuffle=False
)

# Save class names immediately
class_names = list(train_generator.class_indices.keys())
print(f"✅ Classes Found: {class_names}")
with open("classes.txt", "w") as f:
    f.write("\n".join(class_names))

# --- 3. BUILD MODEL ---
print("🏗️ Building MobileNetV2 Model...")

# Load the "Brain" (MobileNetV2) without the top layer
base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
base_model.trainable = False # Freeze base model (don't retrain the basics)

x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dense(128, activation='relu')(x)
x = Dropout(0.2)(x) # Helps prevent overfitting
predictions = Dense(len(class_names), activation='softmax')(x)

model = Model(inputs=base_model.input, outputs=predictions)

model.compile(optimizer=Adam(learning_rate=0.0001), 
              loss='categorical_crossentropy', 
              metrics=['accuracy'])

# --- 4. TRAIN ---
print(f"🚀 Starting Training on {train_generator.samples} images...")
history = model.fit(
    train_generator,
    steps_per_epoch=train_generator.samples // BATCH_SIZE,
    validation_data=validation_generator,
    validation_steps=validation_generator.samples // BATCH_SIZE,
    epochs=EPOCHS
)

# --- 5. SAVE ---
print("💾 Saving Model...")
model.save("model.h5")
print("🎉 Success! Model saved as 'model.h5'")