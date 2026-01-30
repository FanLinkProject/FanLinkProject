package org.example.backend.global.util;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

@Component
@Converter
public class StringEncryptor implements AttributeConverter<String, String>, ApplicationContextAware {

    private static ApplicationContext applicationContext;
    private static EncryptionUtil encryptionUtil;

    @Override
    public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
        StringEncryptor.applicationContext = applicationContext;
        try {
            StringEncryptor.encryptionUtil = applicationContext.getBean(EncryptionUtil.class);
        } catch (Exception e) {
            // Bean이 아직 준비되지 않았을 수 있음 (지연 초기화)
        }
    }

    private EncryptionUtil getEncryptionUtil() {
        if (encryptionUtil != null) {
            return encryptionUtil;
        }
        
        if (applicationContext == null) {
            throw new IllegalStateException(
                "ApplicationContext가 초기화되지 않았습니다. " +
                "StringEncryptor가 Spring Bean으로 등록되어야 합니다."
            );
        }
        
        try {
            encryptionUtil = applicationContext.getBean(EncryptionUtil.class);
            return encryptionUtil;
        } catch (Exception e) {
            throw new IllegalStateException("EncryptionUtil Bean을 찾을 수 없습니다: " + e.getMessage(), e);
        }
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null) {
            return null;
        }
        return getEncryptionUtil().encrypt(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        
        try {
            return getEncryptionUtil().decrypt(dbData);
        } catch (Exception e) {
            // 복호화 실패 시 원본 값 반환 (기존 암호화되지 않은 데이터 호환)
            return dbData;
        }
    }
}
