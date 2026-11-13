plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "app.matzpen"
    compileSdk = 35

    defaultConfig {
        applicationId = "app.matzpen"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1"
    }

    // A fixed key kept in the repo so every build can be installed over the previous one.
    // It is a sideload-only key for a personal app, not a store release key.
    signingConfigs {
        getByName("debug") {
            storeFile = file("../keystore/sideload.keystore")
            storePassword = "matzpen"
            keyAlias = "matzpen"
            keyPassword = "matzpen"
        }
    }

    buildTypes {
        debug { signingConfig = signingConfigs.getByName("debug") }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}
