package org.example.backend.chat.config;

import java.util.HashMap;
import java.util.Map;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.example.backend.chat.dto.response.ChatMessageResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.kafka.support.serializer.JsonSerializer;

/**
 * Kafka 설정
 *
 * 역할:
 * - 채팅 메시지의 비동기 브로드캐스트를 위한 Kafka Producer/Consumer 설정
 *
 * 요구사항 2 (라이브 채팅) 충족:
 * - WebSocket → 서버 → Kafka → 서버 → WebSocket 브로드캐스트
 * - 이 설정은 Kafka 부분 담당
 *
 * 메시지 흐름:
 * 1. ChatService에서 메시지 저장 후 Kafka로 발행 (Producer)
 * 2. ChatMessageConsumer에서 Kafka 메시지 수신 (Consumer)
 * 3. 수신한 메시지를 WebSocket으로 브로드캐스트
 *
 * 토픽 구조:
 * - Producer: "chat-room-{roomId}" (예: "chat-room-1")
 * - Consumer: "chat-room" (현재 코드에서는 단일 토픽 구독, 동적 토픽 패턴 필요 가능성)
 *
 * 주의:
 * - BOOTSTRAP_SERVERS_CONFIG는 환경 변수로 관리 권장
 * - JsonDeserializer.TRUSTED_PACKAGES는 보안상 특정 패키지로 제한 권장
 */
@Configuration
@EnableKafka
public class KafkaConfig {

	/**
	 * Kafka Producer Factory
	 *
	 * 역할:
	 * - ChatMessage를 Kafka로 발행하기 위한 Producer 생성
	 *
	 * 직렬화:
	 * - Key: String (roomId.toString())
	 * - Value: ChatMessage (JSON)
	 *
	 * 토픽:
	 * - ChatService에서 "chat-room-{roomId}" 형식으로 동적 토픽 사용
	 * - Key로 roomId를 사용하여 같은 방의 메시지는 같은 파티션으로 라우팅
	 */
	@Bean
	public ProducerFactory<String, ChatMessageResponse> producerFactory() {
		Map<String, Object> config = new HashMap<>();
		config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:29092");
		config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
		config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
		return new DefaultKafkaProducerFactory<>(config);
	}

	/**
	 * Kafka Template
	 *
	 * 역할:
	 * - ChatService에서 사용하는 Kafka 발행 인터페이스
	 * - kafkaTemplate.send(topic, key, message) 형태로 사용
	 */
	@Bean
	public KafkaTemplate<String, ChatMessageResponse> kafkaTemplate() {
		return new KafkaTemplate<>(producerFactory());
	}

	/**
	 * Kafka Consumer Factory
	 *
	 * 역할:
	 * - ChatMessageConsumer에서 사용하는 Consumer 생성
	 *
	 * 그룹 ID: "chat-server"
	 * - 동일 그룹 내 여러 인스턴스가 메시지를 분산 처리
	 * - 클러스터 환경에서 부하 분산 목적
	 *
	 * 역직렬화:
	 * - Key: String
	 * - Value: ChatMessageEvent (JSON)
	 *
	 * 주의:
	 * - TRUSTED_PACKAGES "*"는 보안상 위험, 특정 패키지로 제한 권장
	 * - JsonDeserializer의 두 번째 파라미터 false: 헤더에 타입 정보가 없어도 역직렬화 가능
	 */
	@Bean
	public ConsumerFactory<String, ChatMessageResponse> consumerFactory() {
		Map<String, Object> config = new HashMap<>();
		config.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:29092");
		config.put(ConsumerConfig.GROUP_ID_CONFIG, "chat-server");
		config.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
		config.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class);
		config.put(JsonDeserializer.TRUSTED_PACKAGES, "*");

		config.put(JsonDeserializer.VALUE_DEFAULT_TYPE, ChatMessageResponse.class.getName());

		return new DefaultKafkaConsumerFactory<>(
			config,
			new StringDeserializer(),
			new JsonDeserializer<>(ChatMessageResponse.class, false));
	}

	/**
	 * Kafka Listener Container Factory
	 *
	 * 역할:
	 * - @KafkaListener가 사용하는 전용 컨테이너 팩토리
	 * - StringDeserializer를 사용하는 기본 컨테이너를 타지 않도록 명시적으로 지정
	 *
	 * 중요:
	 * - ChatMessageConsumer의 @KafkaListener에 containerFactory = "kafkaListenerContainerFactory" 지정 필수
	 * - 이 팩토리를 사용하지 않으면 기본 StringDeserializer 컨테이너를 사용하여 에러 발생
	 */
	@Bean(name = "kafkaListenerContainerFactory")
	public ConcurrentKafkaListenerContainerFactory<String, ChatMessageResponse> kafkaListenerContainerFactory() {
		ConcurrentKafkaListenerContainerFactory<String, ChatMessageResponse> factory =
			new ConcurrentKafkaListenerContainerFactory<>();
		factory.setConsumerFactory(consumerFactory());
		return factory;
	}
}