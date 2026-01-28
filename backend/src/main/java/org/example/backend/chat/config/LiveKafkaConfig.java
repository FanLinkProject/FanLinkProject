package org.example.backend.chat.config;

import java.util.HashMap;
import java.util.Map;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.example.backend.chat.dto.request.LiveChatMessageRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.*;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.kafka.support.serializer.JsonSerializer;

@Configuration
@EnableKafka
public class LiveKafkaConfig {

	@Value("${spring.kafka.bootstrap-servers}")
	private String bootstrapServers;

	@Bean
	public ProducerFactory<String, LiveChatMessageRequest> liveProducerFactory() {
		Map<String, Object> config = new HashMap<>();
		config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
		config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
		config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
		return new DefaultKafkaProducerFactory<>(config);
	}

	@Bean
	public KafkaTemplate<String, LiveChatMessageRequest> liveKafkaTemplate() {
		return new KafkaTemplate<>(liveProducerFactory());
	}

	@Bean
	public ConsumerFactory<String, LiveChatMessageRequest> liveConsumerFactory() {
		Map<String, Object> config = new HashMap<>();
		config.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
		config.put(ConsumerConfig.GROUP_ID_CONFIG, "live-chat-server");
		config.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
		config.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class);

		config.put(JsonDeserializer.TRUSTED_PACKAGES, "*");
		config.put(JsonDeserializer.VALUE_DEFAULT_TYPE, LiveChatMessageRequest.class.getName());

		return new DefaultKafkaConsumerFactory<>(
			config,
			new StringDeserializer(),
			new JsonDeserializer<>(LiveChatMessageRequest.class, false)
		);
	}

	@Bean(name = "liveKafkaListenerContainerFactory")
	public ConcurrentKafkaListenerContainerFactory<String, LiveChatMessageRequest>
	liveKafkaListenerContainerFactory() {

		ConcurrentKafkaListenerContainerFactory<String, LiveChatMessageRequest> factory =
			new ConcurrentKafkaListenerContainerFactory<>();
		factory.setConsumerFactory(liveConsumerFactory());
		return factory;
	}
}
